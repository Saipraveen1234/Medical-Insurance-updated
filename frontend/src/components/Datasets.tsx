import React, { useState } from "react";
import {
  Container,
  Title,
  Card,
  Group,
  Text,
  Table,
  Modal,
  Stack,
  Button,
  ActionIcon,
} from "@mantine/core";
import { useQuery, useMutation } from "@apollo/client";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { GET_UPLOADED_FILES, GET_INVOICE_DATA } from "../graphql/queries";
import { DELETE_FILE } from "../graphql/mutations";
import FileUpload from "./FileUpload";
import { LoadingSpinner } from "./shared/LoadingSpinner";
import { ErrorMessage } from "./shared/ErrorMessage";

const Datasets = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Query for getting uploaded files
  const { data, loading, error, refetch } = useQuery(GET_UPLOADED_FILES, {
    fetchPolicy: "network-only", // This ensures we always get fresh data
  });

  // Delete mutation
  const [deleteFile, { loading: deleteLoading }] = useMutation(DELETE_FILE, {
    onCompleted: (data) => {
      if (data.deleteFile.success) {
        notifications.show({
          title: "Success",
          message: "File deleted successfully", 
          color: "green",
        });
        refetch();
      } else {
        notifications.show({
          title: "Error",
          message: data.deleteFile.message || "Failed to delete file",
          color: "red",
        });
      }
    },
    onError: (error) => {
      notifications.show({
        title: "Error", 
        message: error.message || "Failed to delete file",
        color: "red",
      });
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA } // Added to refresh dashboard data
    ],
   });

  const handleDeleteClick = (planName: string) => {
    setSelectedFile(planName);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedFile) return;

    try {
      await deleteFile({
        variables: { planName: selectedFile },
      });
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleteModalOpen(false);
      setSelectedFile(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between" align="center">
          <Title order={2}>Datasets</Title>
          <FileUpload onUploadSuccess={() => refetch()} />
        </Group>

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack>
            <Title order={3}>Uploaded Files</Title>

            {data?.getUploadedFiles?.length > 0 ? (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>File Name</Table.Th>
                    <Table.Th>Plan Name</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.getUploadedFiles.map((file: any) => (
                    <Table.Tr key={file.planName}>
                      <Table.Td>{file.fileName}</Table.Td>
                      <Table.Td>{file.planName}</Table.Td>
                      <Table.Td>
                        {new Date(file.uploadDate).toLocaleString()}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDeleteClick(file.planName)}
                          loading={
                            deleteLoading && selectedFile === file.planName
                          }
                          disabled={deleteLoading}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No files uploaded yet. Use the upload button to add files.
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedFile(null);
        }}
        title={
          <Text size="lg" fw={500}>
            Confirm Delete
          </Text>
        }
      >
        <Stack spacing="md">
          <Text>
            Are you sure you want to delete this file? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteLoading}
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default Datasets;

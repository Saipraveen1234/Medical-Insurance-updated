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
  Checkbox,
  Transition,
  Paper,
} from "@mantine/core";
import { useQuery, useMutation } from "@apollo/client";
import { notifications } from "@mantine/notifications";
import { IconTrash, IconAlertTriangle } from "@tabler/icons-react";
import { GET_UPLOADED_FILES, GET_INVOICE_DATA } from "../graphql/queries";
import { DELETE_FILE } from "../graphql/mutations";
import FileUpload from "./FileUpload";
import { LoadingSpinner } from "./shared/LoadingSpinner";
import { ErrorMessage } from "./shared/ErrorMessage";

const Datasets = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Query for getting uploaded files
  const { data, loading, error, refetch } = useQuery(GET_UPLOADED_FILES, {
    fetchPolicy: "network-only",
  });

  // Delete mutation
  const [deleteFile, { loading: deleteLoading }] = useMutation(DELETE_FILE, {
    onCompleted: (data) => {
      if (data.deleteFile.success) {
        notifications.show({
          title: "Success",
          message: selectedFiles.length > 1 
            ? "Files deleted successfully"
            : "File deleted successfully",
          color: "green",
        });
        setSelectedFiles([]);
        setSelectAll(false);
        refetch();
      } else {
        notifications.show({
          title: "Error",
          message: data.deleteFile.message || "Failed to delete files",
          color: "red",
        });
      }
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to delete files",
        color: "red",
      });
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA }
    ],
  });

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectAll(event.currentTarget.checked);
    if (event.currentTarget.checked) {
      setSelectedFiles(data.getUploadedFiles.map((file: any) => file.planName));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (planName: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, planName]);
    } else {
      setSelectedFiles(prev => prev.filter(name => name !== planName));
    }
  };

  const handleConfirmDelete = async () => {
    try {
      // Delete files sequentially to avoid overwhelming the server
      for (const planName of selectedFiles) {
        await deleteFile({
          variables: { planName },
        });
      }
      setDeleteModalOpen(false);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  const hasSelectedFiles = selectedFiles.length > 0;

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between" align="center">
          <Title order={2}>Datasets</Title>
          <FileUpload onUploadSuccess={() => refetch()} />
        </Group>

        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack>
            <Group position="apart">
              <Title order={3}>Uploaded Files</Title>
              <Transition mounted={hasSelectedFiles} transition="slide-left">
                {(styles) => (
                  <Paper 
                    shadow="sm" 
                    p="xs" 
                    style={{ ...styles, backgroundColor: '#f8f9fa' }}
                  >
                    <Group>
                      <Text size="sm" fw={500}>
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                      </Text>
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => setDeleteModalOpen(true)}
                        loading={deleteLoading}
                      >
                        Delete Selected
                      </Button>
                    </Group>
                  </Paper>
                )}
              </Transition>
            </Group>

            {data?.getUploadedFiles?.length > 0 ? (
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 40 }}>
                      <Checkbox
                        checked={selectAll}
                        onChange={handleSelectAll}
                        aria-label="Select all files"
                      />
                    </Table.Th>
                    <Table.Th>File Name</Table.Th>
                    <Table.Th>Plan Name</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.getUploadedFiles.map((file: any) => (
                    <Table.Tr key={file.planName}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedFiles.includes(file.planName)}
                          onChange={(event) => 
                            handleSelectFile(file.planName, event.currentTarget.checked)
                          }
                          aria-label={`Select ${file.fileName}`}
                        />
                      </Table.Td>
                      <Table.Td>{file.fileName}</Table.Td>
                      <Table.Td>{file.planName}</Table.Td>
                      <Table.Td>
                        {new Date(file.uploadDate).toLocaleString()}
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setSelectedFiles([file.planName]);
                            setDeleteModalOpen(true);
                          }}
                          loading={deleteLoading && selectedFiles.includes(file.planName)}
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
        }}
        title={
          <Group gap="xs">
            <IconAlertTriangle size={20} color="red" />
            <Text size="lg" fw={500}>Confirm Delete</Text>
          </Group>
        }
      >
        <Stack spacing="md">
          <Text>
            {selectedFiles.length > 1
              ? `Are you sure you want to delete these ${selectedFiles.length} files? This action cannot be undone.`
              : "Are you sure you want to delete this file? This action cannot be undone."}
          </Text>
          {selectedFiles.length > 1 && (
            <Paper withBorder p="xs" bg="gray.0">
              <Stack spacing="xs">
                <Text size="sm" fw={500}>Selected files:</Text>
                {selectedFiles.map(fileName => (
                  <Text size="sm" key={fileName}>• {fileName}</Text>
                ))}
              </Stack>
            </Paper>
          )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setDeleteModalOpen(false);
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
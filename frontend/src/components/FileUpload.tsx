import React, { useState } from "react";
import {
  Button,
  Group,
  Tooltip,
  Box,
  Paper,
  Stack,
  Text,
  CloseButton,
  Transition,
} from "@mantine/core";
import { useMutation } from "@apollo/client";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconCheck, IconX } from "@tabler/icons-react";
import { UPLOAD_FILE } from "../graphql/mutations";
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from "../graphql/queries";

interface UploadStatus {
  fileName: string;
  status: "success" | "error";
  message: string;
}

const FileUpload = () => {
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);

  const [uploadFile] = useMutation(UPLOAD_FILE, {
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA },
    ],
  });

  // Remove a status notification
  const removeStatus = (index: number) => {
    setUploadStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  // Add a new status notification
  const addStatus = (status: UploadStatus) => {
    setUploadStatuses((prev) => [...prev, status]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setUploadStatuses((prev) =>
        prev.filter((s) => s.fileName !== status.fileName)
      );
    }, 5000);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Reset file input
    event.target.value = "";

    for (const file of files) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const content = e.target?.result;
          if (!content) {
            addStatus({
              fileName: file.name,
              status: "error",
              message: "Failed to read file content",
            });
            return;
          }

          try {
            const planName = file.name.split(".")[0].trim();
            const response = await uploadFile({
              variables: {
                fileInput: {
                  name: file.name,
                  content: content.toString().split(",")[1],
                  planName,
                },
              },
            });

            if (response.data?.uploadFile?.success) {
              addStatus({
                fileName: file.name,
                status: "success",
                message: "File uploaded successfully",
              });
            } else {
              addStatus({
                fileName: file.name,
                status: "error",
                message: response.data?.uploadFile?.error || "Upload failed",
              });
            }
          } catch (error) {
            addStatus({
              fileName: file.name,
              status: "error",
              message: error instanceof Error ? error.message : "Upload failed",
            });
          }
        };

        reader.onerror = () => {
          addStatus({
            fileName: file.name,
            status: "error",
            message: "Failed to read file",
          });
        };

        reader.readAsDataURL(file);
      } catch (error) {
        addStatus({
          fileName: file.name,
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
  };

  return (
    <>
      <Group gap="xs">
        <Tooltip label="Upload Excel or CSV files">
          <Button
            component="label"
            leftSection={<IconUpload size={16} />}
            variant="light"
          >
            Upload Files
            <input
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              style={{ display: "none" }}
              multiple
            />
          </Button>
        </Tooltip>
      </Group>

      {/* Floating Notifications Container */}
      <Box
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          width: "300px",
          zIndex: 9999,
        }}
      >
        <Stack>
          {uploadStatuses.map((status, index) => (
            <Transition
              key={`${status.fileName}-${index}`}
              mounted={true}
              transition="slide-left"
            >
              {(styles) => (
                <Paper
                  shadow="sm"
                  p="sm"
                  style={{
                    ...styles,
                    backgroundColor:
                      status.status === "success" ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${
                      status.status === "success" ? "#86efac" : "#fecaca"
                    }`,
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <Group gap="xs">
                      {status.status === "success" ? (
                        <IconCheck size={16} color="#22c55e" />
                      ) : (
                        <IconX size={16} color="#ef4444" />
                      )}
                      <Box>
                        <Text size="sm" fw={500}>
                          {status.fileName}
                        </Text>
                        <Text
                          size="xs"
                          color={status.status === "success" ? "green" : "red"}
                        >
                          {status.message}
                        </Text>
                      </Box>
                    </Group>
                    <CloseButton
                      size="sm"
                      onClick={() => removeStatus(index)}
                    />
                  </Group>
                </Paper>
              )}
            </Transition>
          ))}
        </Stack>
      </Box>
    </>
  );
};

export default FileUpload;

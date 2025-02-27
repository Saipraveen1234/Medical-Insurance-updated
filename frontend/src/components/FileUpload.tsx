import React, { useState } from "react";
import {
  Button,
  Tooltip,
  Box,
  Paper,
  Grid,
  Typography,
  IconButton,
} from "@mui/material";
import { useMutation } from "@apollo/client";
import { UPLOAD_FILE } from "../graphql/mutations";
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from "../graphql/queries";
import {
  Upload as UploadIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

interface UploadStatus {
  fileName: string;
  status: "success" | "error";
  message: string;
}

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [uploadFile] = useMutation(UPLOAD_FILE, {
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA },
    ],
  });

  const removeStatus = (index: number) => {
    setUploadStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const addStatus = (status: UploadStatus) => {
    setUploadStatuses((prev) => [...prev, status]);
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
            onUploadSuccess();
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
      <Tooltip title="Upload Excel or CSV files">
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
        >
          Upload Files
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            multiple
          />
        </Button>
      </Tooltip>
      <Box
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 300,
          zIndex: 1300,
        }}
      >
        <Grid container direction="column" spacing={1}>
          {uploadStatuses.map((status, index) => (
            <Paper
              key={`${status.fileName}-${index}`}
              sx={{
                p: 1,
                backgroundColor:
                  status.status === "success" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${
                  status.status === "success" ? "#86efac" : "#fecaca"
                }`,
              }}
            >
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      {status.status === "success" ? (
                        <CheckIcon color="success" fontSize="small" />
                      ) : (
                        <CancelIcon color="error" fontSize="small" />
                      )}
                    </Grid>
                    <Grid item>
                      <Typography variant="body2" fontWeight="bold">
                        {status.fileName}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={status.status === "success" ? "green" : "red"}
                      >
                        {status.message}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <IconButton size="small" onClick={() => removeStatus(index)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Grid>
      </Box>
    </>
  );
};

export default FileUpload;

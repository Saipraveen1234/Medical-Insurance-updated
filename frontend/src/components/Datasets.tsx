import React, { useState } from "react";
import {
  Container,
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Grid,
  Snackbar,
  Alert,
} from "@mui/material";
import { useQuery, useMutation } from "@apollo/client";
import { GET_UPLOADED_FILES, GET_INVOICE_DATA } from "../graphql/queries";
import { DELETE_FILE } from "../graphql/mutations";
import FileUpload from "./FileUpload";
import CircularProgress from "@mui/material/CircularProgress";
import { Delete as DeleteIcon } from "@mui/icons-material";

const Datasets = () => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );

  const { data, loading, error, refetch } = useQuery(GET_UPLOADED_FILES, {
    fetchPolicy: "network-only",
  });

  const [deleteFile, { loading: deleteLoading }] = useMutation(DELETE_FILE, {
    onCompleted: (data) => {
      if (data.deleteFile.success) {
        setSnackbarMessage(
          selectedFiles.length > 1
            ? "Files deleted successfully"
            : "File deleted successfully"
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setSelectedFiles([]);
        setSelectAll(false);
        refetch();
      } else {
        setSnackbarMessage(data.deleteFile.message || "Failed to delete files");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    },
    onError: (error) => {
      setSnackbarMessage(error.message || "Failed to delete files");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA },
    ],
  });

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSelectAll(checked);
    if (checked && data?.getUploadedFiles) {
      setSelectedFiles(data.getUploadedFiles.map((file: any) => file.planName));
    } else {
      setSelectedFiles([]);
    }
  };

  const handleSelectFile = (planName: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles((prev) => [...prev, planName]);
    } else {
      setSelectedFiles((prev) => prev.filter((name) => name !== planName));
    }
  };

  const handleConfirmDelete = async () => {
    try {
      for (const planName of selectedFiles) {
        await deleteFile({
          variables: { planName },
        });
      }
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Delete error:", err);
      setSnackbarMessage("Failed to delete files");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{error.message}</Alert>;

  const hasSelectedFiles = selectedFiles.length > 0;

  return (
    <Container>
      <Box sx={{ mb: 2 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography variant="h4">Datasets</Typography>
          </Grid>
          <Grid item>
            <FileUpload onUploadSuccess={() => refetch()} />
          </Grid>
        </Grid>
      </Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5">Uploaded Files</Typography>
          {hasSelectedFiles && (
            <Paper sx={{ p: 1, backgroundColor: "#f8f9fa" }}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography variant="body2">
                    {selectedFiles.length} file
                    {selectedFiles.length !== 1 ? "s" : ""} selected
                  </Typography>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteModalOpen(true)}
                    disabled={deleteLoading}
                  >
                    Delete Selected
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Box>
        {data?.getUploadedFiles?.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 40 }}>
                  <Checkbox checked={selectAll} onChange={handleSelectAll} />
                </TableCell>
                <TableCell>File Name</TableCell>
                <TableCell>Plan Name</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell sx={{ width: 100 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.getUploadedFiles.map((file: any) => (
                <TableRow key={file.planName}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.includes(file.planName)}
                      onChange={(e) =>
                        handleSelectFile(file.planName, e.target.checked)
                      }
                    />
                  </TableCell>
                  <TableCell>{file.fileName}</TableCell>
                  <TableCell>{file.planName}</TableCell>
                  <TableCell>
                    {new Date(file.uploadDate).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="text"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setSelectedFiles([file.planName]);
                        setDeleteModalOpen(true);
                      }}
                      disabled={deleteLoading}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 4 }}
          >
            No files uploaded yet. Use the upload button to add files.
          </Typography>
        )}
      </Card>
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            {selectedFiles.length > 1
              ? `Are you sure you want to delete these ${selectedFiles.length} files? This action cannot be undone.`
              : "Are you sure you want to delete this file? This action cannot be undone."}
          </Typography>
          {selectedFiles.length > 1 && (
            <Paper variant="outlined" sx={{ p: 1, mt: 2 }}>
              <Typography variant="subtitle2">Selected files:</Typography>
              {selectedFiles.map((fileName) => (
                <Typography key={fileName} variant="body2">
                  • {fileName}
                </Typography>
              ))}
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Datasets;

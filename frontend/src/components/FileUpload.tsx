import React from "react";
import { Button, Group, Tooltip } from "@mantine/core"; // Removed Text import
import { useMutation } from "@apollo/client";
import { notifications } from "@mantine/notifications";
import { IconUpload } from "@tabler/icons-react";
import { UPLOAD_FILE } from "../graphql/mutations";
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from "../graphql/queries";

const FileUpload = () => {
  const [uploadFile, { loading }] = useMutation(UPLOAD_FILE, {
    onCompleted: (data) => {
      if (data.uploadFile.success) {
        notifications.show({
          title: "Success",
          message: "File uploaded successfully",
          color: "green",
        });
      }
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA },
    ],
  });

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!allowedTypes.includes(file.type)) {
      notifications.show({
        title: "Error",
        message: "Invalid file type. Please upload an Excel or CSV file.",
        color: "red",
      });
      return;
    }

    // Optional: Validate file size (e.g., max 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      notifications.show({
        title: "Error",
        message: "File size exceeds the limit of 5MB.",
        color: "red",
      });
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (!content) return;

        let planName = file.name.split(".")[0].trim();

        await uploadFile({
          variables: {
            fileInput: {
              name: file.name,
              content: content.toString().split(",")[1],
              planName,
            },
          },
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to upload file",
        color: "red",
      });
    }
  };

  return (
    <Group gap="xs">
      <Tooltip label="Upload Excel or CSV file">
        <Button
          component="label"
          loading={loading}
          leftSection={<IconUpload size={16} />}
          variant="light"
        >
          Upload File
          <input
            type="file"
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            style={{ display: "none" }}
            disabled={loading}
          />
        </Button>
      </Tooltip>
    </Group>
  );
};

export default FileUpload;

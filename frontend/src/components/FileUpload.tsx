import React from 'react';
import { Button, Group, Text, Tooltip } from '@mantine/core';
import { useMutation } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { IconUpload } from '@tabler/icons-react';
import { UPLOAD_FILE } from '../graphql/mutations';
import { GET_INVOICE_DATA, GET_UPLOADED_FILES } from '../graphql/queries';

const FileUpload = () => {
  const [uploadFile, { loading }] = useMutation(UPLOAD_FILE, {
    onCompleted: (data) => {
      if (data.uploadFile.success) {
        notifications.show({
          title: 'Success',
          message: 'File uploaded successfully',
          color: 'green'
        });
      }
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_INVOICE_DATA }
    ]
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (!content) return;

        let planName = file.name.split('.')[0].trim();
        
        await uploadFile({
          variables: {
            fileInput: {
              name: file.name,
              content: content.toString().split(',')[1],
              planName
            }
          }
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to upload file',
        color: 'red'
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
            style={{ display: 'none' }}
            disabled={loading}
          />
        </Button>
      </Tooltip>
    </Group>
  );
};

export default FileUpload;
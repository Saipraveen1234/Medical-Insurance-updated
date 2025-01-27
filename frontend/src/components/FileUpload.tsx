import React from 'react';
import { Button, Group, Text, Tooltip } from '@mantine/core';
import { useMutation } from '@apollo/client';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconFileSpreadsheet } from '@tabler/icons-react';
import { UPLOAD_FILE } from '../graphql/mutations';
import { GET_METRICS, GET_COST_ANALYSIS, GET_UPLOADED_FILES, GET_MONTHLY_ANALYSIS } from '../graphql/queries';

const FileUpload: React.FC = () => {
  const [uploadFile, { loading }] = useMutation(UPLOAD_FILE, {
    onCompleted: (data) => {
      if (data.uploadFile.success) {
        notifications.show({
          title: 'Success',
          message: 'File uploaded successfully',
          color: 'green'
        });
      } else {
        notifications.show({
          title: 'Upload Failed',
          message: data.uploadFile.message,
          color: 'red'
        });
      }
    },
    onError: (error) => {
      console.error('Upload error:', error);
      notifications.show({
        title: 'Upload Failed',
        message: error.message || 'Failed to upload file',
        color: 'red'
      });
    },
    refetchQueries: [
      { query: GET_UPLOADED_FILES },
      { query: GET_METRICS },
      { query: GET_COST_ANALYSIS },
      { query: GET_MONTHLY_ANALYSIS, variables: { year: new Date().getFullYear() } }
    ]
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Check file extension
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        notifications.show({
          title: 'Invalid File',
          message: 'Please upload a CSV or Excel file',
          color: 'red'
        });
        return;
      }

      // Read file
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result;
          if (!content) {
            throw new Error('Failed to read file content');
          }

          // Get plan name from filename
          let planName = file.name.split('.')[0].trim();
          
          // Handle UHG files specially
          if (planName.toUpperCase().startsWith('UHG')) {
            const match = planName.match(/UHG([A-Z]+)(\d{4})/i);
            if (match) {
              const [_, month, year] = match;
              planName = `UHG-${month}-${year}`;
            }
          }

          console.log('Uploading file:', {
            name: file.name,
            planName,
            contentLength: content.toString().length
          });

          // Upload file
          await uploadFile({
            variables: {
              fileInput: {
                name: file.name,
                content: content.toString().split(',')[1],
                planName
              }
            }
          });

        } catch (error) {
          console.error('Upload processing error:', error);
          notifications.show({
            title: 'Upload Failed',
            message: error instanceof Error ? error.message : 'Failed to process file',
            color: 'red'
          });
        }
      };

      reader.onerror = () => {
        notifications.show({
          title: 'Error',
          message: 'Failed to read file',
          color: 'red'
        });
      };

      reader.readAsDataURL(file);

    } catch (error) {
      console.error('File handling error:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to process file',
        color: 'red'
      });
    }
  };

  return (
    <Group gap="xs">
      <Tooltip 
        label="Supported formats: .xlsx, .xls, .csv" 
        position="bottom"
        withArrow
      >
        <Button 
          component="label"
          loading={loading}
          leftSection={<IconUpload size={16} />}
          variant="light"
          radius="xl"
          size="sm"
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
      <Text size="xs" c="dimmed">
        Supported formats: .xlsx, .xls, .csv
      </Text>
    </Group>
  );
};

export default FileUpload;
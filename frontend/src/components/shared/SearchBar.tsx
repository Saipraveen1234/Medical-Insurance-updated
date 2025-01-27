import React, { useState } from 'react';
import { TextInput, ActionIcon, Box, Loader } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  placeholder = "Search employees...",
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState(value);

  const handleClear = () => {
    setInputValue('');
    onChange('');
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.currentTarget.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onChange(inputValue);
    }
  };

  // Update local input value when parent value changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <Box>
      <TextInput
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        size="md"
        radius="md"
        leftSection={<IconSearch size={18} style={{ color: '#888' }} />}
        rightSection={
          isLoading ? (
            <Loader size="xs" />
          ) : inputValue ? (
            <ActionIcon onClick={handleClear} variant="subtle" color="gray">
              <IconX size={16} />
            </ActionIcon>
          ) : null
        }
        styles={{
          input: {
            '&:focus': {
              borderColor: '#228be6'
            }
          }
        }}
      />
    </Box>
  );
};

export default SearchBar;
import React from 'react';
import { ChakraProvider, Box } from '@chakra-ui/react';
import theme from './theme';
import Weather from './components/Weather';

function App() {
    return (
        <ChakraProvider theme={theme}>
            <Box
                bg={'gray.700'}
                h="100vh"
                display={'flex'}
                alignItems={'center'}
                justifyContent={'center'}
                p={3}
            >
                <Weather />
            </Box>
        </ChakraProvider>
    );
}

export default App;

import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  Button,
  Flex,
  Text,
  Input,
  Image,
  Heading,
  useColorMode,
} from '@chakra-ui/react';
import theme from './theme';
import { tempFormatter } from './helpers/tempFormatter';

function App() {
  const { colorMode } = useColorMode();
  const apiKey = 'dda9e3feecbfc5d8248f9fe1af6e7a54';
  const [unit, setUnit] = useState(false);
  const [weatherData, setWeatherData] = useState({
    main: {
      temp: 0,
    },
    weather: [{ main: 'test' }],
  });

  const [city, setCity] = useState('kathmandu');

  const getWeatherHandler = async e => {
    e.preventDefault();
    const apiCall = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );
    const data = await apiCall.json();
    setWeatherData(data);
    console.log(data);
  };

  return (
    <ChakraProvider theme={theme}>
      <Box
        bg={'gray.700'}
        h="100vh"
        display={'flex'}
        alignItems={'center'}
        justifyContent={'center'}
        p={2}
      >
        <Box
          borderRadius={'10px'}
          bg={colorMode === 'light' ? 'gray.50' : 'gray.900'}
          height={'500px'}
          width={'100%'}
          maxW="960px"
          display="flex"
          flexDirection="column"
          justifyContent="start"
          alignItems="center"
          pos="relative"
        >
          <Flex justify="space-around" align="center">
            <Input
              margin={'10px'}
              placeholder="Enter City"
              value={city}
              onChange={e => setCity(e.target.value)}
            />
            <Button onClick={getWeatherHandler} margin={'10px'}>
              Search
            </Button>
            <Button
              pos="absolute"
              top="2"
              right="28"
              onClick={() =>
                setUnit(unit => {
                  return !unit;
                })
              }
            >
              {unit ? '°C' : '°F'}
            </Button>
          </Flex>
          <Image
            w={'300px'}
            src={
              'https://freepngimg.com/thumb/weather/23525-5-weather-free-download.png'
            }
            alt="Weather"
          />
          <Heading text={'100px'} color={'white'}>
            {tempFormatter(weatherData.main.temp, unit)}
          </Heading>
          <Text>{weatherData.weather[0].main}</Text>
        </Box>
      </Box>
    </ChakraProvider>
  );
}

export default App;

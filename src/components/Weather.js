import { tempFormatter } from '../helpers/tempFormatter';
import React, { useState } from 'react';
import { weather } from '../helpers/constants';
import {
    Heading,
    Box,
    Button,
    Flex,
    Text,
    Input,
    Image,
} from '@chakra-ui/react';

const Weather = () => {
    const apiKey = 'dda9e3feecbfc5d8248f9fe1af6e7a54';
    // const [unit, setUnit] = useState(false);
    const [isValid, setIsValid] = useState(true);
    const [weatherData, setWeatherData] = useState({
        main: {
            temp: 0,
        },
        name: '',
        weather: [{ main: '' }],
    });

    const [city, setCity] = useState('');
    const [image, setImage] = useState('');

    const getWeatherHandler = async e => {
        e.preventDefault();
        if (city.length === 0) {
            setIsValid(false);
            return;
        }
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
        );
        const data = await res.json();
        if (res.status !== 200) {
            setIsValid(false);
            return;
        } else {
            setIsValid(true);
        }
        setWeatherData(data);
        setCity('');
        console.log(data);

        if (data.weather[0].main === 'Clouds') {
            setImage(weather.clouds);
        } else if (data.weather[0].main === 'Rain') {
            setImage(weather.rain);
        } else if (data.weather[0].main === 'Clear') {
            setImage(weather.clear);
        } else if (data.weather[0].main === 'Snow') {
            setImage(weather.snow);
        } else if (data.weather[0].main === 'Drizzle') {
            setImage(weather.drizzle);
        } else if (data.weather[0].main === 'Thunderstorm') {
            setImage(weather.thunderstorm);
        } else if (data.weather[0].main === 'Mist') {
            setImage(weather.mist);
        } else if (data.weather[0].main === 'Fog') {
            setImage(weather.mist);
        }
    };

    return (
        <Box
            backgroundBlendMode={'difference'}
            borderRadius={'10px'}
            bg={'gray.900'}
            height={'100%'}
            width={'100%'}
            maxW="960px"
            display="flex"
            flexDirection="column"
            justifyContent="start"
            alignItems="center"
            // p={3}
            py={8}
            px={3}
        >
            <Flex marginBottom={4} gap={2} alignItems="space-around">
                <Input
                    isInvalid={!isValid}
                    placeholder="Enter City"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                />
                <Button onClick={getWeatherHandler}>Search</Button>
            </Flex>
            {weatherData.name ? (
                <>
                    <Image
                        borderRadius={8}
                        w={'300px'}
                        h={'300px'}
                        src={image}
                        alt="Weather"
                        pos="relative"
                    />
                    <Text fontSize="80px" color={'white'}>
                        {tempFormatter(weatherData.main.temp, 1)}
                    </Text>
                    <Text
                        color={'gray.400'}
                        fontSize={'16px'}
                        fontWeight={'italics'}
                    >
                        {weatherData.name}
                    </Text>
                    <Text
                        color={'gray.400'}
                        fontSize={'16px'}
                        fontWeight={'italics'}
                    >
                        {weatherData.weather[0].main}
                    </Text>
                </>
            ) : (
                <Heading>Enter city to get its weather.</Heading>
            )}
        </Box>
    );
};

export default Weather;

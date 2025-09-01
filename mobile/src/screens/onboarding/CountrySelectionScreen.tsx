import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Alert,
} from 'react-native';
import {
  Box,
  VStack,
  HStack,
  Text as NBText,
  Input,
  Icon,
  useColorModeValue,
  Pressable,
} from 'native-base';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../store/hooks';
import { selectCountry } from '../../store/slices/authSlice';

interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
}

const countries: Country[] = [
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', currency: 'NPR' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', currency: 'PEN' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', currency: 'BIF' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', currency: 'MWK' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', flag: '🇿🇼', currency: 'ZWL' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', currency: 'BWP' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', currency: 'NAD' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', currency: 'LSL' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', currency: 'SZL' },
  { code: 'MG', name: 'Madagascar', flag: '🇲🇬', currency: 'MGA' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', currency: 'MUR' },
  { code: 'SC', name: 'Seychelles', flag: '🇸🇨', currency: 'SCR' },
  { code: 'KM', name: 'Comoros', flag: '🇰🇲', currency: 'KMF' },
  { code: 'DJ', name: 'Djibouti', flag: '🇩🇯', currency: 'DJF' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', currency: 'SOS' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', currency: 'ERN' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', currency: 'SDG' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸', currency: 'SSP' },
  { code: 'CF', name: 'Central African Republic', flag: '🇨🇫', currency: 'XAF' },
  { code: 'TD', name: 'Chad', flag: '🇹🇩', currency: 'XAF' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF' },
  { code: 'GQ', name: 'Equatorial Guinea', flag: '🇬🇶', currency: 'XAF' },
  { code: 'GA', name: 'Gabon', flag: '🇬🇦', currency: 'XAF' },
  { code: 'CG', name: 'Republic of the Congo', flag: '🇨🇬', currency: 'XAF' },
  { code: 'CD', name: 'Democratic Republic of the Congo', flag: '🇨🇩', currency: 'CDF' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', currency: 'AOA' },
  { code: 'ST', name: 'São Tomé and Príncipe', flag: '🇸🇹', currency: 'STN' },
  { code: 'CV', name: 'Cape Verde', flag: '🇨🇻', currency: 'CVE' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', currency: 'GMD' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', currency: 'GNF' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', currency: 'XOF' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', currency: 'SLL' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', currency: 'LRD' },
  { code: 'CI', name: 'Ivory Coast', flag: '🇨🇮', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', currency: 'XOF' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', currency: 'XOF' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', currency: 'XOF' },
  { code: 'MR', name: 'Mauritania', flag: '🇲🇷', currency: 'MRU' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳', currency: 'TND' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿', currency: 'DZD' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD' },
  { code: 'LY', name: 'Libya', flag: '🇱🇾', currency: 'LYD' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', currency: 'JOD' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', currency: 'LBP' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', currency: 'SYP' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', currency: 'IQD' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', currency: 'IRR' },
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', currency: 'AFN' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', currency: 'LKR' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻', currency: 'MVR' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', currency: 'BTN' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', currency: 'MMK' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', currency: 'LAK' },
  { code: 'KH', name: 'Cambodia', flag: '🇰🇭', currency: 'KHR' },
  { code: 'MN', name: 'Mongolia', flag: '🇲🇳', currency: 'MNT' },
  { code: 'KZ', name: 'Kazakhstan', flag: '🇰🇿', currency: 'KZT' },
  { code: 'UZ', name: 'Uzbekistan', flag: '🇺🇿', currency: 'UZS' },
  { code: 'KG', name: 'Kyrgyzstan', flag: '🇰🇬', currency: 'KGS' },
  { code: 'TJ', name: 'Tajikistan', flag: '🇹🇯', currency: 'TJS' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', currency: 'TMT' },
  { code: 'AZ', name: 'Azerbaijan', flag: '🇦🇿', currency: 'AZN' },
  { code: 'GE', name: 'Georgia', flag: '🇬🇪', currency: 'GEL' },
  { code: 'AM', name: 'Armenia', flag: '🇦🇲', currency: 'AMD' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾', currency: 'EUR' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', currency: 'EUR' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺', currency: 'EUR' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', currency: 'CHF' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', currency: 'CHF' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', currency: 'EUR' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', currency: 'EUR' },
  { code: 'VA', name: 'Vatican City', flag: '🇻🇦', currency: 'EUR' },
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', currency: 'EUR' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', currency: 'CZK' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰', currency: 'EUR' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺', currency: 'HUF' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴', currency: 'RON' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬', currency: 'BGN' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷', currency: 'EUR' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮', currency: 'EUR' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪', currency: 'EUR' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻', currency: 'EUR' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹', currency: 'EUR' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', currency: 'SEK' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', currency: 'DKK' },
  { code: 'IS', name: 'Iceland', flag: '🇮🇸', currency: 'ISK' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪', currency: 'EUR' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', currency: 'EUR' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', currency: 'RUB' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', currency: 'BYN' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', currency: 'UAH' },
  { code: 'MD', name: 'Moldova', flag: '🇲🇩', currency: 'MDL' },
  { code: 'RS', name: 'Serbia', flag: '🇷🇸', currency: 'RSD' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', currency: 'EUR' },
  { code: 'BA', name: 'Bosnia and Herzegovina', flag: '🇧🇦', currency: 'BAM' },
  { code: 'MK', name: 'North Macedonia', flag: '🇲🇰', currency: 'MKD' },
  { code: 'AL', name: 'Albania', flag: '🇦🇱', currency: 'ALL' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', currency: 'EUR' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', currency: 'ILS' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', currency: 'ILS' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', currency: 'YER' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
  { code: 'YE', name: 'Yemen', flag: '🇾🇪', currency: 'YER' },
];

const CountrySelectionScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');

  const backgroundColor = useColorModeValue('background.primary', 'background.primary');
  const textColor = useColorModeValue('text.primary', 'text.primary');
  const cardBackground = useColorModeValue('background.secondary', 'background.secondary');
  const inputBackground = useColorModeValue('background.tertiary', 'background.tertiary');

  const filteredCountries = useMemo(() => {
    return countries.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const handleCountrySelect = (country: Country) => {
    dispatch(selectCountry(country.code));
  };

  const renderCountryItem = ({ item }: { item: Country }) => (
    <Pressable
      onPress={() => handleCountrySelect(item)}
      _pressed={{ opacity: 0.7 }}
    >
      <Box
        bg={cardBackground}
        p={4}
        mb={2}
        borderRadius="lg"
        borderWidth={1}
        borderColor="background.tertiary"
      >
        <HStack alignItems="center" space={3}>
          <NBText fontSize="2xl">{item.flag}</NBText>
          <VStack flex={1}>
            <NBText color={textColor} fontWeight="semibold" fontSize="md">
              {item.name}
            </NBText>
            <NBText color="text.secondary" fontSize="sm">
              {item.currency}
            </NBText>
          </VStack>
          <Icon
            as={Ionicons}
            name="chevron-forward"
            size="sm"
            color="text.secondary"
          />
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg={backgroundColor} safeArea>
      <VStack flex={1} px={4}>
        {/* Header */}
        <VStack alignItems="center" mb={6} pt={4}>
          <Icon
            as={Ionicons}
            name="globe"
            size="4xl"
            color="primary.500"
            mb={3}
          />
          <NBText fontSize="2xl" fontWeight="bold" color={textColor} textAlign="center" mb={2}>
            Select Your Country
          </NBText>
          <NBText fontSize="md" color="text.secondary" textAlign="center">
            This helps us provide localized content and payment options
          </NBText>
        </VStack>

        {/* Search Input */}
        <Box mb={4}>
          <Input
            placeholder="Search countries..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            bg={inputBackground}
            borderColor="background.tertiary"
            _focus={{ borderColor: 'primary.500' }}
            InputLeftElement={
              <Icon
                as={Ionicons}
                name="search"
                size="sm"
                color="text.secondary"
                ml={3}
              />
            }
          />
        </Box>

        {/* Countries List */}
        <FlatList
          data={filteredCountries}
          renderItem={renderCountryItem}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </VStack>
    </Box>
  );
};

export default CountrySelectionScreen;

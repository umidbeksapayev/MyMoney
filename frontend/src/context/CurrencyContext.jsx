import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState({});
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL;

  // Load user's preferred currency
  useEffect(() => {
    const loadUserCurrency = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(
            `${API_URL}/currency/user/preference`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          setCurrency(response.data.currency || 'USD');
        }
      } catch (error) {
        console.error('Error loading user currency:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserCurrency();
  }, [API_URL]);

  // Load exchange rates when currency changes
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        // Always load rates from USD as base
        // This gives us: { VND: 25000, EUR: 0.85, ... } meaning 1 USD = X currency
        const response = await axios.get(`${API_URL}/currency/rates/USD`);
        setExchangeRates(response.data.rates);
      } catch (error) {
        console.error('Error loading exchange rates:', error);
      }
    };

    loadExchangeRates();
  }, [API_URL]); // Remove currency dependency - always load USD rates

  // Update user's currency preference
  const updateCurrency = async (newCurrency) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.put(
          `${API_URL}/currency/user/preference`,
          { currency: newCurrency },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
      setCurrency(newCurrency);
    } catch (error) {
      console.error('Error updating currency:', error);
      throw error;
    }
  };

  // Convert amount to user's currency
  const convertAmount = (amount, fromCurrency = 'USD') => {
    if (!amount || amount === 0) return 0;
    if (fromCurrency === currency) return amount;
    
    // exchangeRates contains rates from the base currency (set by API call)
    // When we call /currency/rates/USD, we get: { VND: 25000, EUR: 0.85, ... }
    // This means: 1 USD = 25000 VND, 1 USD = 0.85 EUR
    
    if (fromCurrency === 'USD') {
      // Direct conversion from USD to target currency
      const rate = exchangeRates[currency] || 1;
      return amount * rate;
    } else if (currency === 'USD') {
      // Reverse conversion from some currency to USD
      const rate = exchangeRates[fromCurrency] || 1;
      return amount / rate;
    } else {
      // Convert from one non-USD currency to another via USD
      const fromRate = exchangeRates[fromCurrency] || 1;
      const toRate = exchangeRates[currency] || 1;
      const amountInUSD = amount / fromRate;
      return amountInUSD * toRate;
    }
  };

  // Format currency with proper symbol
  const formatCurrency = (amount, currencyCode = currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      VND: '₫',
      KRW: '₩',
      THB: '฿',
      SGD: 'S$',
      MYR: 'RM',
      IDR: 'Rp',
      PHP: '₱',
      INR: '₹',
      AUD: 'A$',
      CAD: 'C$',
      CHF: 'Fr',
      HKD: 'HK$',
      NZD: 'NZ$',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      RUB: '₽',
      BRL: 'R$',
      MXN: '$',
      ZAR: 'R',
      TRY: '₺',
      AED: 'د.إ',
      SAR: 'ر.س'
    };

    const symbol = symbols[currencyCode] || currencyCode + ' ';
    
    // Currencies without decimal places
    const noDecimalCurrencies = ['VND', 'JPY', 'KRW', 'IDR'];
    
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: noDecimalCurrencies.includes(currencyCode) ? 0 : 2,
      maximumFractionDigits: noDecimalCurrencies.includes(currencyCode) ? 0 : 2
    }).format(Math.abs(amount));

    // Currencies that put symbol after amount
    const symbolAfterCurrencies = ['VND', 'JPY', 'KRW', 'IDR', 'SEK', 'NOK', 'DKK', 'PLN'];
    
    if (symbolAfterCurrencies.includes(currencyCode)) {
      return `${formattedAmount} ${symbol}`;
    }

    return `${symbol}${formattedAmount}`;
  };

  // Convert and format amount to user's display currency
  const formatAmount = (amount, fromCurrency = 'USD') => {
    const convertedAmount = convertAmount(amount, fromCurrency);
    return formatCurrency(convertedAmount, currency);
  };

  const value = {
    currency,
    setCurrency: updateCurrency,
    exchangeRates,
    convertAmount,
    formatCurrency,
    formatAmount,
    loading
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}


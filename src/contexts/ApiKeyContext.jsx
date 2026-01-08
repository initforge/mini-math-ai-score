import { createContext, useContext, useState } from 'react';

const ApiKeyContext = createContext(null);

export function ApiKeyProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('geminiApiKey') || '';
  });

  const updateApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('geminiApiKey', key);
  };

  const value = {
    apiKey,
    updateApiKey
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within ApiKeyProvider');
  }
  return context;
}


import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export function useVehicleDropdowns(initialMake = '', initialModel = '') {
  const [makesList, setMakesList] = useState<{ make: string; count: number }[]>([]);
  const [modelsList, setModelsList] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>(initialMake);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);

  // Load makes on mount
  useEffect(() => {
    apiClient.getMakes()
      .then((data) => {
        if (data && data.length > 0) {
          setMakesList(data);
          if (!selectedMake) {
            setSelectedMake(data[0].make);
          }
        }
      })
      .catch((err) => console.error('Failed to load makes:', err));
  }, []);

  // Fetch models dynamically when selectedMake changes
  useEffect(() => {
    if (!selectedMake) return;

    const fetchModels = async () => {
      try {
        if (typeof (apiClient as any).getModels === 'function') {
          const rawModels = await (apiClient as any).getModels(selectedMake);
          if (rawModels && rawModels.length > 0) {
            const normalizedModels = rawModels.map((m: any) =>
              typeof m === 'string' ? m : (m.model || m.name || String(m))
            );
            setModelsList(normalizedModels);
            if (!normalizedModels.includes(selectedModel)) {
              setSelectedModel(normalizedModels[0]);
            }
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }

      // Fallback models
      const fallbacks = ['Harrier', 'Land Cruiser', 'RAV4', 'Corolla', 'Hilux', 'Standard'];
      setModelsList(fallbacks);
      if (!fallbacks.includes(selectedModel)) {
        setSelectedModel(fallbacks[0]);
      }
    };

    fetchModels();
  }, [selectedMake]);

  return {
    makesList,
    modelsList,
    selectedMake,
    setSelectedMake,
    selectedModel,
    setSelectedModel,
  };
}
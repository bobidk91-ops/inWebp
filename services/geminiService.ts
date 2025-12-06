import { AiData } from "../types";

export const generateGeminiDescription = async (imageUrl: string): Promise<AiData> => {
  try {
    // Fetch blob from local blob URL
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Convert to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data url prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Call our own backend
    const apiResponse = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64: base64Data }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(errorData.error || 'Server error');
    }

    const data = await apiResponse.json();
    return data as AiData;

  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
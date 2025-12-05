import React, { useState, useEffect } from 'react';
import { Upload, X, Download, Image as ImageIcon, CheckCircle, RefreshCw, Settings, FolderUp, Sparkles, Zap, Share2 } from 'lucide-react';
import { AppFile, ProcessingOptions, AiData } from './types';
import { processImage, slugify, formatSize } from './services/imageService';
import { generateGeminiDescription } from './services/geminiService';
import { PreviewModal } from './components/PreviewModal';

const tg = window.Telegram?.WebApp;

export default function App() {
  const [files, setFiles] = useState<AppFile[]>([]);
  const [quality, setQuality] = useState(0.8);
  const [cropTo43, setCropTo43] = useState(true);
  const [autoAi, setAutoAi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // AI & Preview State
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      document.body.style.backgroundColor = tg.themeParams.bg_color || '#f1f5f9';
      try {
        tg.enableClosingConfirmation();
      } catch (e) {
        console.log("Closing confirmation not supported");
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles: AppFile[] = Array.from(fileList)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        originalUrl: URL.createObjectURL(file),
        processedUrl: null,
        status: 'pending',
        info: { originalSize: file.size, processedSize: 0, width: 0, height: 0 },
        aiData: null 
      }));
    
    if (newFiles.length === 0) {
      if (tg && tg.showAlert) tg.showAlert("No images found in selection!");
      else alert("No images found!");
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const startProcessing = async () => {
    setIsProcessing(true);
    const options: ProcessingOptions = {
        quality,
        maxWidth: 1600,
        format: 'image/webp',
        cropTo43
    };

    const filesToProcess = [...files];
    
    for (let i = 0; i < filesToProcess.length; i++) {
      if (filesToProcess[i].status === 'done' && !autoAi) continue;
      if (filesToProcess[i].status === 'done' && autoAi && filesToProcess[i].aiData) continue;

      try {
        // 1. Image Processing
        if (filesToProcess[i].status !== 'done') {
            filesToProcess[i] = { ...filesToProcess[i], status: 'processing' };
            setFiles([...filesToProcess]);

            const result = await processImage(filesToProcess[i].originalUrl, options);
            
            filesToProcess[i] = {
            ...filesToProcess[i],
            processedUrl: result.processedUrl,
            info: { 
                ...filesToProcess[i].info, 
                processedSize: result.processedSize,
                width: result.width,
                height: result.height
            },
            status: 'done'
            };
        }

        // 2. Auto AI Generation
        if (autoAi && filesToProcess[i].processedUrl && !filesToProcess[i].aiData) {
            try {
                const aiData = await generateGeminiDescription(filesToProcess[i].processedUrl!);
                filesToProcess[i] = { ...filesToProcess[i], aiData };
            } catch (aiError) {
                console.error(`AI Error for ${filesToProcess[i].file.name}:`, aiError);
            }
        }

        setFiles([...filesToProcess]);
      } catch (error) {
        console.error("Error processing file", error);
        filesToProcess[i] = { ...filesToProcess[i], status: 'error' };
        setFiles([...filesToProcess]);
      }
    }
    setIsProcessing(false);
  };

  const handleGenerateAi = async () => {
    const activeFile = files.find(f => f.id === previewFileId);
    if (!activeFile) return;

    setIsAiLoading(true);
    try {
        const urlToUse = activeFile.processedUrl || activeFile.originalUrl;
        const aiData = await generateGeminiDescription(urlToUse);
        
        setFiles(prev => prev.map(f => 
            f.id === previewFileId ? { ...f, aiData } : f
        ));
    } catch (error: any) {
        const msg = error.message || "Unknown AI Error";
        if (tg && tg.showAlert) tg.showAlert(`AI Error: ${msg}`);
        else alert(`AI Error: ${msg}`);
    } finally {
        setIsAiLoading(false);
    }
  };

  const downloadFile = async (file: AppFile) => {
    if (!file.processedUrl) return;
    
    let fileName;
    if (file.aiData && file.aiData.alt_text) {
        const slug = slugify(file.aiData.alt_text);
        const truncatedSlug = slug.length > 100 ? slug.substring(0, 100) : slug;
        fileName = `${truncatedSlug}.webp`;
    } else {
        const originalName = file.file.name.substring(0, file.file.name.lastIndexOf('.')) || file.file.name;
        fileName = `avito_${originalName}.webp`;
    }

    // 1. Mobile Share/Save Logic (Primary for Telegram WebApp)
    if (typeof navigator.share === 'function') {
      try {
        const blob = await fetch(file.processedUrl).then(r => r.blob());
        const fileToShare = new File([blob], fileName, { type: 'image/webp' });
        
        // Check if device supports sharing this file type
        if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [fileToShare] })) {
             const msg = "Ваше устройство не поддерживает сохранение этого формата через меню 'Поделиться'.";
             if (tg && tg.showAlert) tg.showAlert(msg);
             else alert(msg);
             return;
        }

        await navigator.share({
          files: [fileToShare],
        });
        return; // Success, exit function
      } catch (e: any) {
        // Ignore "AbortError" which happens when user closes the share sheet manually
        if (e.name === 'AbortError' || e.message?.toLowerCase().includes('cancel')) {
            return;
        }
        
        console.error("Share failed", e);
        const errorMsg = "Ошибка сохранения: " + (e.message || "Неизвестная ошибка");
        if (tg && tg.showAlert) tg.showAlert(errorMsg);
        else alert(errorMsg);
        return; // Don't try fallback if sharing explicitly failed on a supported device
      }
    }

    // 2. Desktop Fallback (Classic Download Link)
    const link = document.createElement('a');
    link.href = file.processedUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
  };

  const activeFile = files.find(f => f.id === previewFileId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 pb-20 select-none">
      
      {activeFile && (
        <PreviewModal 
            file={activeFile}
            isOpen={!!activeFile}
            onClose={() => setPreviewFileId(null)}
            onGenerateAi={handleGenerateAi}
            onDownload={() => downloadFile(activeFile)}
            isAiLoading={isAiLoading}
            onCopy={copyToClipboard}
        />
      )}

      <div className="max-w-md mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                    <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Avito Optimizer</h1>
                    <p className="text-xs text-slate-500">Compress + AI Descriptions</p>
                </div>
            </div>
            <div className="bg-purple-50 p-2 rounded-full">
                <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
        </div>

        {/* Upload Area Group */}
        <div className="space-y-3">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-blue-200 text-center relative hover:bg-blue-50 transition-colors group">
                <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                />
                <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-700">Select Photos</h3>
                    <p className="text-xs text-slate-400">Tap to upload files</p>
                </div>
            </div>

            <div className="relative">
                <input 
                    type="file" 
                    multiple 
                    // @ts-ignore
                    webkitdirectory="" 
                    directory=""
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                />
                <button className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-colors">
                    <FolderUp className="w-5 h-5 text-slate-400" />
                    Upload Folder
                </button>
            </div>
        </div>

        {/* Settings Compact */}
        <div className="bg-white p-4 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex flex-col gap-3">
                <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-slate-400"/>
                        <span className="text-sm font-medium">Crop 4:3 (Avito)</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={cropTo43} onChange={(e) => setCropTo43(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-500"/>
                        <span className="text-sm font-medium">Auto-Generate AI</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoAi} onChange={(e) => setAutoAi(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </div>
                </label>
            </div>

            <div className="h-px bg-slate-100 my-2"></div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Image Quality</span>
                  <span className="font-bold text-blue-600">{Math.round(quality * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.4" max="1.0" step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none accent-blue-600 cursor-pointer"
                />
            </div>
        </div>

        {/* Action Button */}
        {files.length > 0 && (
             <button 
              onClick={startProcessing}
              disabled={isProcessing}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                isProcessing 
                  ? 'bg-slate-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95'
              }`}
            >
              {isProcessing ? <RefreshCw className="animate-spin w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
              {isProcessing ? 'Processing...' : `Process (${files.length})`}
            </button>
        )}

        {/* List */}
        <div className="space-y-2 pb-safe">
            {files.map((file) => (
                <div key={file.id} className="bg-white p-3 rounded-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-bottom-2">
                    <div className="relative">
                        <img 
                            src={file.processedUrl || file.originalUrl} 
                            className="w-16 h-16 rounded-lg object-cover bg-slate-100 cursor-pointer" 
                            onClick={() => setPreviewFileId(file.id)}
                            alt="thumbnail"
                        />
                        {file.aiData && (
                            <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full p-0.5 border-2 border-white">
                                <Sparkles className="w-2.5 h-2.5" />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0" onClick={() => setPreviewFileId(file.id)}>
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-xs font-medium truncate max-w-[100px] text-slate-700">{file.file.name}</span>
                             {file.status === 'done' && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                    -{Math.round((1 - file.info.processedSize/file.info.originalSize) * 100)}%
                                </span>
                             )}
                        </div>
                        <div className="text-xs text-slate-400">
                            {formatSize(file.info.originalSize)} 
                            {file.status === 'done' && ` ➝ ${formatSize(file.info.processedSize)}`}
                        </div>
                        {file.aiData && file.aiData.alt_text && (
                            <div className="text-xs text-purple-600 truncate mt-1 font-medium">
                                {file.aiData.alt_text}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex gap-1">
                        <button 
                            onClick={() => setPreviewFileId(file.id)}
                            className={`p-2 rounded-lg transition-colors ${file.aiData ? 'bg-purple-100 text-purple-700' : 'bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-600'}`}
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                        
                        {file.status === 'done' && (
                            <button 
                                onClick={() => downloadFile(file)}
                                className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                            >
                                {typeof navigator.share === 'function' ? <Share2 className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                            </button>
                        )}
                    </div>

                    <button 
                      onClick={(e) => removeFile(file.id, e)} 
                      className="p-2 text-slate-300 hover:text-red-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}
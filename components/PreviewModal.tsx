import React from 'react';
import { X, Sparkles, Wand2, Loader2, Copy, Download, RefreshCw, Share2 } from 'lucide-react';
import { AppFile } from '../types';

interface PreviewModalProps {
  file: AppFile;
  isOpen: boolean;
  onClose: () => void;
  onGenerateAi: () => void;
  onDownload: () => void;
  onShare: () => void;
  isAiLoading: boolean;
  onCopy: (text: string) => void;
  canShare: boolean;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  file,
  isOpen,
  onClose,
  onGenerateAi,
  onDownload,
  onShare,
  isAiLoading,
  onCopy,
  canShare
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 animate-in fade-in duration-200 overflow-y-auto backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-semibold text-slate-700 ml-1">AI Assistant & Preview</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Image */}
          <div className="bg-slate-100 flex items-center justify-center p-4 min-h-[250px]">
            <img 
              src={file.processedUrl || file.originalUrl} 
              alt="Preview" 
              className="max-h-[40vh] object-contain rounded-lg shadow-sm"
            />
          </div>

          {/* AI Section */}
          <div className="p-5 flex-1 bg-white">
            {!file.aiData && !isAiLoading && (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Generate Avito Listing</h4>
                  <p className="text-sm text-slate-500 mt-1">
                    Gemini will generate an SEO title, Alt-text for renaming, description, and price estimate.
                  </p>
                </div>
                <button 
                  onClick={onGenerateAi}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Wand2 className="w-5 h-5" />
                  Generate Magic ✨
                </button>
              </div>
            )}

            {isAiLoading && (
              <div className="text-center py-12 space-y-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="text-slate-500 font-medium animate-pulse">Analyzing image...</p>
              </div>
            )}

            {file.aiData && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                {/* Alt Text (SEO Filename) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
                    <span>SEO Alt-Text (Filename)</span>
                    <Sparkles className="w-3 h-3" />
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-blue-50 p-3 rounded-xl text-blue-900 font-medium border border-blue-100 text-sm break-all">
                      {file.aiData.alt_text}
                    </div>
                    <button 
                      onClick={() => onCopy(file.aiData!.alt_text)}
                      className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-600 transition-colors"
                      title="Copy Alt-text"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">This text will be used as the filename when downloading.</p>
                </div>

                {/* Title */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Listing Title</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 p-3 rounded-xl text-slate-800 font-medium border border-slate-100">
                      {file.aiData.title}
                    </div>
                    <button 
                      onClick={() => onCopy(file.aiData!.title)}
                      className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Price */}
                {file.aiData.price_guess && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Price Estimate</label>
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-sm">
                      {file.aiData.price_guess}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Description</label>
                  <div className="relative">
                    <textarea 
                      readOnly
                      value={file.aiData.description}
                      className="w-full h-40 bg-slate-50 p-3 rounded-xl text-slate-700 text-sm border border-slate-100 focus:outline-none resize-none"
                    />
                    <button 
                      onClick={() => onCopy(file.aiData!.description)}
                      className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white shadow-sm rounded-lg text-slate-600 backdrop-blur-sm transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={onGenerateAi}
                  className="w-full py-2 text-purple-600 font-medium text-sm hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 sticky bottom-0 z-10">
          {canShare && (
            <button 
                onClick={onShare}
                disabled={!file.processedUrl}
                className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
                <Share2 className="w-5 h-5" />
                Share
            </button>
          )}
          
          <button 
            onClick={onDownload}
            disabled={!file.processedUrl}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
        </div>

      </div>
    </div>
  );
};
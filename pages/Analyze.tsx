// Pages/Analyze.tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Edit2, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CameraCapture from '../components/nutrition/CameraCapture';
import NutritionCard from '../components/nutrition/NutritionCard';
import EditNutritionModal from '../components/nutrition/EditNutritionModal';

export default function Analyze() {
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleCapture = (file: File, imageUrl: string) => {
    setCapturedFile(file);
    setPreviewUrl(imageUrl);
    setPrediction(null);
  };

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!capturedFile) throw new Error('No file captured');
      setIsAnalyzing(true);

      // FormData -> send file to serverless API
      const fd = new FormData();
      fd.append('image', capturedFile);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Analyze failed: ${res.status} ${text}`);
      }

      const data = await res.json();
      setIsAnalyzing(false);
      return data;
    },
    onSuccess: (data) => {
      setPrediction(data);
      toast.success('Food analyzed successfully!');
    },
    onError: (err: any) => {
      console.error(err);
      setIsAnalyzing(false);
      toast.error('Failed to analyze food. See console.');
    },
  });

  const saveMealMutation = useMutation({
    mutationFn: async (mealData: any) => {
      // Simple local storage-based save for now (no base44)
      const prev = JSON.parse(localStorage.getItem('calorie_ai_meals' || '[]') || '[]');
      prev.unshift(mealData);
      localStorage.setItem('calorie_ai_meals', JSON.stringify(prev));
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todaysMeals']);
      queryClient.invalidateQueries(['allMeals']);
      toast.success('Meal saved to your log!');
      navigate(createPageUrl('Home'));
    },
    onError: () => {
      toast.error('Failed to save meal. Please try again.');
    }
  });

  const handleSave = (editedData = prediction) => {
    if (!editedData) return;
    const mealData = {
      ...editedData,
      date: editedData.date ?? format(new Date(), 'yyyy-MM-dd'),
      is_corrected: editedData !== prediction
    };
    saveMealMutation.mutate(mealData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F5F3EE] to-[#EAE7DC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Analyze Food</h1>
          <div className="w-24" />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <CameraCapture onCapture={handleCapture} disabled={isAnalyzing} />
        </motion.div>

        <AnimatePresence>
          {capturedFile && !prediction && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={isAnalyzing}
                size="lg"
                className="w-full bg-[#8B9D83] hover:bg-[#7A8C73] text-white py-6 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  'Analyze Food'
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnalyzing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-8 text-center space-y-4 border-2 border-[#8B9D83]/20">
            <div className="w-16 h-16 mx-auto bg-[#8B9D83]/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#8B9D83] animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing your food...</h3>
              <p className="text-gray-600">Our AI is recognizing the food and calculating nutrition</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {prediction && !isAnalyzing && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <NutritionCard prediction={prediction} />
              <div className="flex gap-4">
                <Button onClick={() => setShowEditModal(true)} variant="outline" size="lg" className="flex-1 border-2">
                  <Edit2 className="w-5 h-5 mr-2" />
                  Edit Details
                </Button>
                <Button onClick={() => handleSave()} disabled={saveMealMutation.isLoading} size="lg" className="flex-1 bg-[#8B9D83] hover:bg-[#7A8C73] text-white">
                  {saveMealMutation.isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save to Log
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EditNutritionModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} prediction={prediction} onSave={handleSave} />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Camera, History, BarChart3, Target, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfDay, endOfDay } from 'date-fns';
import DailySummary from '../components/nutrition/DailySummary';
import MealCard from '../components/nutrition/MealCard';

export default function Home() {
  const { data: goals } = useQuery({
    queryKey: ['userGoals'],
    queryFn: async () => {
      const goalsList = await base44.entities.UserGoals.list();
      return goalsList[0] || null;
    }
  });

  const { data: todaysMeals = [] } = useQuery({
    queryKey: ['todaysMeals'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return await base44.entities.FoodLog.filter({ date: today }, '-created_date', 50);
    }
  });

  const consumed = {
    calories: todaysMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
    protein: todaysMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
    carbs: todaysMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
    fat: todaysMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F5F3EE] to-[#EAE7DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 py-8"
        >
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight">
            Macro & Calorie AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your intelligent nutrition tracking assistant powered by AI
          </p>
        </motion.div>

        {/* Quick Action - Analyze Food */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Link to={createPageUrl('Analyze')}>
            <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#8B9D83] to-[#6B7D63] p-8 sm:p-12 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                    <Camera className="w-5 h-5 text-white" />
                    <span className="text-white text-sm font-medium">AI-Powered Recognition</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Analyze Your Food
                  </h2>
                  <p className="text-white/90 text-lg">
                    Snap a photo or upload an image to get instant nutrition insights
                  </p>
                </div>
                <Button 
                  size="lg"
                  className="bg-white text-[#8B9D83] hover:bg-gray-50 shadow-lg px-8 py-6 text-lg group-hover:scale-105 transition-transform"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Daily Summary and Quick Links */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <DailySummary consumed={consumed} goals={goals} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <Link to={createPageUrl('Goals')}>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#8B9D83]/20 hover:border-[#8B9D83] hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#8B9D83]/10 rounded-lg group-hover:bg-[#8B9D83]/20 transition-colors">
                    <Target className="w-5 h-5 text-[#8B9D83]" />
                  </div>
                  <h3 className="font-semibold text-lg">Daily Goals</h3>
                </div>
                <p className="text-sm text-gray-600">
                  {goals ? 'Manage your nutrition targets' : 'Set your daily nutrition goals'}
                </p>
              </div>
            </Link>

            <Link to={createPageUrl('Analytics')}>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#8B9D83]/20 hover:border-[#8B9D83] hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#FFB4A2]/20 rounded-lg group-hover:bg-[#FFB4A2]/30 transition-colors">
                    <BarChart3 className="w-5 h-5 text-[#FF8A65]" />
                  </div>
                  <h3 className="font-semibold text-lg">Analytics</h3>
                </div>
                <p className="text-sm text-gray-600">View trends and insights</p>
              </div>
            </Link>

            <Link to={createPageUrl('History')}>
              <div className="bg-white rounded-2xl p-6 border-2 border-[#8B9D83]/20 hover:border-[#8B9D83] hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <History className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg">Meal History</h3>
                </div>
                <p className="text-sm text-gray-600">Browse all logged meals</p>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Recent Meals */}
        {todaysMeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Today's Meals</h2>
              <Link to={createPageUrl('History')}>
                <Button variant="ghost" className="text-[#8B9D83] hover:text-[#7A8C73]">
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {todaysMeals.slice(0, 3).map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          </motion.div>
        )}

        {todaysMeals.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 mx-auto mb-6 bg-[#8B9D83]/10 rounded-full flex items-center justify-center">
              <Camera className="w-16 h-16 text-[#8B9D83]" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No meals logged today</h3>
            <p className="text-gray-600 mb-6">Start tracking by analyzing your first meal</p>
            <Link to={createPageUrl('Analyze')}>
              <Button size="lg" className="bg-[#8B9D83] hover:bg-[#7A8C73]">
                Analyze Food Now
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
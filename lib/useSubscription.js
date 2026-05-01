'use client'
import { useAuth } from './useAuth'

// Plan hierarchy — each plan includes all plans below it
const PLAN_RANK = { free: 0, student_pro: 1, teacher_pro: 2, lifetime: 99 }

export function useSubscription() {
  const { profile, loading } = useAuth()
  const plan = profile?.plan || 'free'

  const isPro     = PLAN_RANK[plan] >= PLAN_RANK['student_pro']
  const isTeacher = PLAN_RANK[plan] >= PLAN_RANK['teacher_pro']
  const isLifetime = plan === 'lifetime'

  // How many AI generations the user gets per month
  const generationLimit = isLifetime || isTeacher ? Infinity
    : isPro ? Infinity   // Student Pro — unlimited
    : 15                 // Free tier

  return {
    plan,
    isPro,
    isTeacher,
    isLifetime,
    isFree: plan === 'free',
    generationLimit,
    loading,
  }
}

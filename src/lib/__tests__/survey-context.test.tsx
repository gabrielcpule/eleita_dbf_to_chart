import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SurveyProvider, useSurvey } from '../survey-context'
import React from 'react'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SurveyProvider>{children}</SurveyProvider>
)

describe('SurveyContext', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    expect(result.current.state.raw).toBeNull()
    expect(result.current.state.step).toBe(0)
    expect(result.current.state.chartConfigs).toHaveLength(0)
  })

  it('sets step', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'SET_STEP', payload: 1 }))
    expect(result.current.state.step).toBe(1)
  })

  it('adds a chart', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    expect(result.current.state.chartConfigs).toHaveLength(1)
    expect(result.current.state.chartConfigs[0].chartType).toBe('bar')
  })

  it('removes a chart', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    const id = result.current.state.chartConfigs[0].id
    act(() => result.current.dispatch({ type: 'REMOVE_CHART', payload: id }))
    expect(result.current.state.chartConfigs).toHaveLength(1)
  })

  it('updates a chart config', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'ADD_CHART' }))
    const updated = {
      ...result.current.state.chartConfigs[0],
      chartType: 'pie' as const,
    }
    act(() => result.current.dispatch({ type: 'UPDATE_CHART', payload: updated }))
    expect(result.current.state.chartConfigs[0].chartType).toBe('pie')
  })

  it('sets demographics filter', () => {
    const { result } = renderHook(() => useSurvey(), { wrapper })
    act(() => result.current.dispatch({ type: 'SET_DEMOGRAPHICS_FILTER', payload: { LOCAL: 'S' } }))
    expect(result.current.state.filters.demographics.LOCAL).toBe('S')
  })
})

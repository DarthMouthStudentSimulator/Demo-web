import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { EmotionEntry, LocationRecord, UserProfile } from './api'
import { getDays, getEmotions, getLocations, getUserProfile, listUsers, listWeeks } from './api'
import { CAMPUS_PLACES, matchPlaceByText } from './geo'

function Select({ value, onChange, options, label }: { value: string | number; onChange: (v: string) => void; options: Array<{ value: string; label: string }>; label: string }) {
  const getLabelColor = (label: string) => {
    const colors = {
      'Student': '#e11d48',
      'Week': '#059669', 
      'Day': '#dc2626',
      'Layer': '#7c3aed'
    }
    return colors[label as keyof typeof colors] || '#374151'
  }
  
  return (
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginRight: 12 }}>
      <span style={{ 
        color: getLabelColor(label), 
        fontWeight: '600',
        textShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>{label}</span>
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} style={{
        border: `2px solid ${getLabelColor(label)}`,
        borderRadius: '6px',
        padding: '4px 8px',
        fontSize: '14px',
        fontWeight: '500',
        color: getLabelColor(label)
      }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function App() {
  const [users, setUsers] = useState<string[]>([])
  const [user, setUser] = useState<string>('u01')
  const [weeks, setWeeks] = useState<number[]>([])
  const [week, setWeek] = useState<number>(1)
  const [days, setDays] = useState<string[]>([])
  const [day, setDay] = useState<string>('')
  const [locations, setLocations] = useState<LocationRecord[]>([])
  const [emotions, setEmotions] = useState<EmotionEntry[]>([])
  const [layer, setLayer] = useState<'Emotion' | 'Activity' | 'Class'>('Activity')
  const [timeIndex, setTimeIndex] = useState<number>(-1)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [geminiApiKey, setGeminiApiKey] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [currentMessage, setCurrentMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false)
  const chatMessagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listUsers().then(setUsers).catch(console.error)
  }, [])

  useEffect(() => {
    listWeeks(user)
      .then((ws) => {
        setWeeks(ws)
        if (!ws.includes(week)) setWeek(ws[0] ?? 1)
      })
      .catch(console.error)
    getEmotions(user).then(setEmotions).catch(console.error)
    getUserProfile(user).then(setUserProfile).catch(console.error)
    // Clear chat when switching users
    setChatMessages([])
  }, [user, week])

  useEffect(() => {
    getDays(user, week)
      .then((ds) => {
        setDays(ds)
        setDay(ds[0] ?? '')
        setTimeIndex(-1)
      })
      .catch(console.error)
  }, [user, week])

  useEffect(() => {
    if (!day) return
    getLocations(user, week, day).then((recs) => {
      // ensure chronological order
      const sorted = [...recs].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      setLocations(sorted)
      setTimeIndex(sorted.length - 1)
    }).catch(console.error)
  }, [user, week, day])

  const weeklyEmotion = useMemo(() => emotions.find((e) => e.week === week)?.emotion, [emotions, week])
  const weeklyDescription = useMemo(() => emotions.find((e) => e.week === week)?.weekly_desc, [emotions, week])

  // computed time scrub window
  const timeLabels = useMemo(() => locations.map(r => new Date(r.time).toLocaleTimeString()), [locations])
  const visibleLocations = useMemo(() => {
    const cutoff = timeIndex >= 0 ? timeIndex : locations.length - 1
    const sub = locations.slice(0, cutoff + 1)
    // filter by layer
    const classPlaces = new Set<string>(['hall1','hall2','study building','library','main building'])
    return sub.filter(rec => {
      const place = matchPlaceByText(rec.location_des || rec.activity || rec.location || undefined)
      if (!place) return false
      if (layer === 'Activity') return true
      if (layer === 'Class') return classPlaces.has(place.key)
      // Emotion layer does not show pins
      return false
    })
  }, [locations, timeIndex, layer])

  // cluster by place within current selection
  const clustered = useMemo(() => {
    const map = new Map<string, { count: number; x: number; y: number; label: string }>()
    for (const rec of visibleLocations) {
      const place = matchPlaceByText(rec.location_des || rec.activity || rec.location || undefined)
      if (!place) continue
      const k = place.key
      const ent = map.get(k)
      if (ent) ent.count += 1
      else map.set(k, { count: 1, x: place.x, y: place.y, label: place.label })
    }
    return Array.from(map.values())
  }, [visibleLocations])

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || !geminiApiKey.trim() || !userProfile || !weeklyDescription) return
    
    setIsLoading(true)
    const userMsg = currentMessage.trim()
    setCurrentMessage('')
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      // const response = await fetch('http://localhost:8089/api/chat', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     message: userMsg,
      //     apiKey: geminiApiKey,
      //     studentId: user,
      //     bigFive: userProfile.big_five,
      //     weeklyDesc: weeklyDescription,
      //     week: week
      //   })
      // })

        const requestBody = {
          message: userMsg,
          apiKey: geminiApiKey,
          studentId: user,
          bigFive: userProfile.big_five,
          weeklyDesc: weeklyDescription,
          week: week
        };
        console.log("Request Body Payload:", JSON.stringify(requestBody, null, 2));
        const response = await fetch('http://localhost:8089/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('Chat request failed')
      
      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      let errorMessage = 'Sorry, I encountered an error. '
      
      if (error instanceof Error && error.message?.includes('Failed to fetch')) {
        errorMessage += 'Please check your internet connection and try again.'
      } else if (error instanceof Error && error.message?.includes('API key')) {
        errorMessage += 'Please verify your Gemini API key is correct.'
      } else {
        errorMessage += 'Please check your API key and try again.'
      }
      
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }])
    } finally {
      setIsLoading(false)
    }
  }

  const testApiKey = async () => {
    if (!geminiApiKey.trim()) return
    
    setIsTestingApi(true)
    try {
      const response = await fetch(`/api/test-gemini?api_key=${encodeURIComponent(geminiApiKey)}`)
      const data = await response.json()
      
      if (data.success) {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '✅ API connection successful! Your Gemini API key is working correctly.' 
        }])
      } else {
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `❌ API test failed: ${data.error}` 
        }])
      }
    } catch {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ API test failed: Network error. Please check your connection.' 
      }])
    } finally {
      setIsTestingApi(false)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16, position: 'relative' }}>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>
      <h2 style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontSize: '28px',
        fontWeight: 'bold',
        textAlign: 'center',
        margin: '0 0 20px 0'
      }}>🎓 Campus Life Dashboard</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Select value={user} onChange={(v) => setUser(v)} options={users.map((u) => ({ value: u, label: u }))} label="Student" />
        <Select value={week} onChange={(v) => setWeek(Number(v))} options={weeks.map((w) => ({ value: String(w), label: `Week ${w}` }))} label="Week" />
        <Select value={day} onChange={(v) => setDay(v)} options={days.map((d) => ({ value: d, label: d }))} label="Day" />
        <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginRight: 12 }}>
          <span>Layer</span>
          <select value={layer} onChange={(e) => setLayer(e.target.value as 'Emotion' | 'Activity' | 'Class')}>
            {['Emotion','Activity','Class'].map(l => (<option key={l} value={l}>{l}</option>))}
          </select>
        </label>
      </div>

      {/* Week slider */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ 
            color: '#059621', 
            fontWeight: '600',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            minWidth: '40px'
          }}>Week</span>
          <input type="range" min={weeks[0] ?? 1} max={weeks[weeks.length-1] ?? 10} step={1} value={week} onChange={(e) => setWeek(Number(e.target.value))} style={{ 
            flex: 1,
            accentColor: '#059621'
          }} />
          <span style={{ 
            color: '#000000', 
            fontWeight: 'bold',
            fontSize: '16px',
            minWidth: '30px',
            textAlign: 'center',
            background: 'linear-gradient(135deg,rgb(56, 246, 183),rgb(2, 58, 40))',

            padding: '4px 8px',
            borderRadius: '12px',
            textShadow: 'none'
          }}>{week}</span>
        </div>
      </div>

      {/* Day slider (index-based) */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ 
            color: '#dc2626', 
            fontWeight: '600',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            minWidth: '40px'
          }}>Day</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, days.length - 1)}
            step={1}
            value={Math.max(0, days.indexOf(day))}
            onChange={(e) => setDay(days[Number(e.target.value)] ?? day)}
            style={{ 
              flex: 1,
              accentColor: '#dc2626'
            }}
          />
          <span style={{ 
            fontWeight: 'bold',
            fontSize: '14px',
            minWidth: '60px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px'
          }}>{day || '-'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 16 }}>
        {/* Campus Map */}
        <div style={{ 
          position: 'relative', 
          background: '#eef2f7', 
          overflow: 'hidden', 
          borderRadius: 8, 
          lineHeight: 0,
          width: '100%',
          height: 'fit-content',
          contain: 'layout style'
        }}>
          <img 
            src="/campus_map.png" 
            alt="Campus map" 
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: 'block',
              maxWidth: '100%'
            }} 
          />
          {layer !== 'Emotion' && clustered.length > 0 && clustered.map((c, idx) => {
            // Ensure positions are within campus boundaries
            const clampedX = Math.max(0.05, Math.min(0.95, c.x));
            const clampedY = Math.max(0.05, Math.min(0.95, c.y));
            
            return (
              <div key={`student-${idx}-${c.label}`} title={c.label} style={{ 
                position: 'absolute', 
                left: `${clampedX * 100}%`, 
                top: `${clampedY * 100}%`, 
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
                pointerEvents: 'auto',
                width: 'fit-content',
                height: 'fit-content'
              }}>
                <img 
                  src="/student.png" 
                  alt="Student" 
                  style={{
                    width: Math.min(50, 50 + c.count * 2),
                    height: Math.min(50, 50 + c.count * 2),
                    borderRadius: '50%',
                    border: '2px solid #d97706',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    backgroundColor: 'white',
                    display: 'block'
                  }} 
                />
                {c.count > 1 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: -6, 
                    right: -6, 
                    background: '#dc2626', 
                    color: 'white', 
                    padding: '1px 4px', 
                    borderRadius: 8, 
                    fontSize: 9, 
                    fontWeight: 'bold',
                    minWidth: 14,
                    textAlign: 'center',
                    lineHeight: '12px'
                  }}>
                    {c.count}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section: Legend, Time, Analytics, and Interaction */}
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Left Column: Legend and Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Legend - Close to Campus Map */}
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f8fafc' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 16,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>🗺️ Map Legend</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', rowGap: 6, columnGap: 8, marginTop: 8 }}>
                <img src="/student.png" alt="Student" style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #b38f00' }} />
                <span style={{ fontSize: 12 }}>Student/NPC position</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: 14,
                  color: '#7c3aed',
                  fontWeight: 'bold'
                }}>Campus Locations:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
                  {CAMPUS_PLACES.map((p) => {
                    const getLocationEmoji = (key: string) => {
                      const emojis = {
                        'study building': '📚',
                        'alumni gym': '🏋️',
                        'laboratory': '🔬',
                        'community club': '🏛️',
                        'library': '📖',
                        'gym': '💪',
                        'medical center': '🏥',
                        'main building': '🏢',
                        'art center': '🎨',
                        'hall 2': '🏫',
                        'dormitory': '🏠',
                        'inn': '🏨',
                        'cafeteria': '☕',
                        'dining hall': '🍽️',
                        'hall 1': '🏫',
                        'green': '🌳'
                      }
                      return emojis[key as keyof typeof emojis] || '📍'
                    }
                    return (
                      <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{getLocationEmoji(p.key)}</span>
                        <span style={{ 
                          color: '#4338ca',
                          fontWeight: '500',
                          fontSize: '12px'
                        }}>{p.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Time scrubber */}
            <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#f8fafc' }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: 16,
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>⏰ Time Control</h3>
              {timeLabels.length ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <span style={{ 
                    fontSize: 12, 
                    color: '#7c3aed',
                    fontWeight: '600'
                  }}>{timeLabels[0]}</span>
                  <input type="range" min={0} max={Math.max(0, timeLabels.length - 1)} step={1} value={Math.max(0, timeIndex)} onChange={(e) => setTimeIndex(Number(e.target.value))} style={{ 
                    flex: 1,
                    accentColor: '#8b5cf6'
                  }} />
                  <span style={{ 
                    fontSize: 12, 
                    color: '#7c3aed',
                    fontWeight: '600'
                  }}>{timeLabels[Math.max(0, timeIndex)]}</span>
                </div>
              ) : (
                <p style={{ marginTop: 8, fontSize: 12 }}>No records.</p>
              )}
            </div>
          </div>

          {/* Right Column: Analytics and Interaction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Student Analytics */}
            <div style={{ border: '2px solid #3b82f6', borderRadius: 8, padding: 8, backgroundColor: '#f8fafc' }}>
              <h2 style={{ 
                margin: '0 0 12px 0', 
                fontSize: 18, 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>👤 Student Analytics</h2>
              
              {/* Student Profile */}
              {userProfile && (
                <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, backgroundColor: 'white' }}>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    color: '#1e40af',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}>
                    <img src="/student.png" alt="Student" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    {userProfile.display_name}
                  </h3>
                  
                  {/* Big Five Personality */}
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: 15,
                      color: '#7c2d12',
                      fontWeight: 'bold'
                    }}>Personality (Big Five):</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(userProfile.big_five).map(([trait, value]) => {
                        const getPersonalityEmoji = (trait: string) => {
                          const emojis = {
                            openness: '🔍',
                            conscientiousness: '📋',
                            extraversion: '🗣️',
                            agreeableness: '🤝',
                            neuroticism: '😰'
                          }
                          return emojis[trait as keyof typeof emojis] || '📊'
                        }
                        return (
                          <div key={trait} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14 }}>{getPersonalityEmoji(trait)}</span>
                            <span style={{ 
                              minWidth: 90, 
                              fontSize: 13, 
                              textTransform: 'capitalize',
                              color: '#92400e',
                              fontWeight: '600'
                            }}>{trait.replace('_', ' ')}:</span>
                            <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 12 }}>
                              <div style={{
                                width: `${value}%`,
                                height: '100%',
                                background: value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444',
                                borderRadius: 4
                              }} />
                            </div>
                            <span style={{ 
                              fontSize: 12, 
                              minWidth: 25,
                              fontWeight: 'bold',
                              color: value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444'
                            }}>{value}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Enrolled Classes */}
                  <div>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: 15,
                      color: '#1d4ed8',
                      fontWeight: 'bold'
                    }}>📚 Enrolled Classes:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {userProfile.enrolled_classes.map((course, idx) => (
                        <div key={idx} style={{ 
                          padding: 6, 
                          background: '#f8fafc', 
                          borderRadius: 4, 
                          border: '1px solid #e2e8f0',
                          fontSize: 12
                        }}>
                          <div style={{ 
                            fontWeight: 'bold',
                            color: '#1e40af',
                            fontSize: '13px'
                          }}>{course.code}</div>
                          <div style={{ 
                            color: '#4338ca',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>{course.name}</div>
                          <div style={{ 
                            color: '#7c3aed', 
                            fontSize: 11,
                            fontWeight: '600'
                          }}>{course.credits} credits</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Emotion Status */}
              <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: 'white' }}>
                <h3 style={{ 
                  margin: 0,
                  background: 'linear-gradient(135deg, #ec4899, #be185d)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>Emotion Status (Week {week})</h3>
                {weeklyEmotion ? (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(weeklyEmotion).map(([k, v]) => {
                      const getEmoji = (key: string, value: number) => {
                        const emojis = {
                          stamina: value >= 80 ? '💪' : value >= 50 ? '🚶' : '😴',
                          knowledge: value >= 80 ? '🧠' : value >= 50 ? '📚' : '🤔',
                          stress: value >= 80 ? '😰' : value >= 50 ? '😐' : '😌',
                          happy: value >= 80 ? '😄' : value >= 50 ? '🙂' : '😔',
                          sleep: value >= 80 ? '😴' : value >= 50 ? '🌙' : '😵',
                          social: value >= 80 ? '👥' : value >= 50 ? '👋' : '😶'
                        }
                        return emojis[key as keyof typeof emojis] || '📊'
                      }
                      return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{getEmoji(k, v as number)}</span>
                          <span style={{ 
                            minWidth: 70, 
                            textTransform: 'capitalize',
                            color: '#be185d',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>{k}:</span>
                          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 16, position: 'relative' }}>
                            <div style={{
                              width: `${Math.max(0, Math.min(100, v as number))}%`,
                              height: '100%',
                              background: (v as number) >= 80 ? '#10b981' : (v as number) >= 50 ? '#f59e0b' : '#ef4444',
                              borderRadius: 6,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{ 
                            minWidth: 40, 
                            fontSize: 13, 
                            fontWeight: 'bold',
                            color: (v as number) >= 80 ? '#10b981' : (v as number) >= 50 ? '#f59e0b' : '#ef4444'
                          }}>{v}/100</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p>No data.</p>
                )}
              </div>
            </div>

            {/* Student Interaction */}
            <div style={{ border: '2px solid #059669', borderRadius: 8, padding: 8, backgroundColor: '#f0fdf4' }}>
              <h2 style={{ 
                margin: '0 0 12px 0', 
                fontSize: 18, 
                textAlign: 'center',
                background: 'linear-gradient(135deg, #059669, #065f46)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 'bold'
              }}>💬 Student Interaction</h2>
              
              {/* Weekly Character Description */}
              {weeklyDescription && (
                <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 12, backgroundColor: 'white' }}>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: 17,
                    color: '#047857',
                    fontWeight: 'bold'
                  }}>📖 Week {week} Experience</h3>
                  <div style={{ 
                    maxHeight: 150, 
                    overflowY: 'auto', 
                    fontSize: 12, 
                    lineHeight: 1.4, 
                    color: '#374151',
                    backgroundColor: '#f9fafb',
                    padding: 8,
                    borderRadius: 4,
                    border: '1px solid #e5e7eb'
                  }}>
                    {weeklyDescription}
                  </div>
                </div>
              )}

              {/* Gemini Chat */}
              <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: 'white' }}>
                <h3 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: 17,
                  color: '#047857',
                  fontWeight: 'bold'
                }}>🤖 Chat with Student</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ 
                display: 'block', 
                fontSize: 13, 
                marginBottom: 4, 
                color: '#047857',
                fontWeight: '600'
              }}>
                Gemini API Key:
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  style={{
                    flex: 1,
                    padding: 6,
                    fontSize: 12,
                    border: '2px solid #059669',
                    borderRadius: 4,
                    boxSizing: 'border-box',
                    fontWeight: '500'
                  }}
                />
                <button
                  onClick={testApiKey}
                  disabled={!geminiApiKey.trim() || isTestingApi}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    backgroundColor: !geminiApiKey.trim() || isTestingApi ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: !geminiApiKey.trim() || isTestingApi ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isTestingApi ? '🔄' : '🧪'} Test
                </button>
              </div>
              {!geminiApiKey.trim() && (
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>
                  💡 Get your API key at{' '}
                  <a 
                    href="https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'none' }}
                  >
                    Google AI Studio
                  </a>
                </div>
              )}
            </div>
                
                {/* Chat Messages */}
                <div style={{
                  height: 200,
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  padding: 0,
                  marginBottom: 8,
                  backgroundColor: '#ffffff',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  {chatMessages.length === 0 ? (
                    <div style={{ 
                      color: '#9ca3af', 
                      fontSize: 12, 
                      textAlign: 'center', 
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <div style={{ fontSize: '24px' }}>💬</div>
                      <div style={{ 
                        color: '#059669',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>Start a conversation with {userProfile?.display_name}!</div>
                      <div style={{ 
                        fontSize: 11, 
                        color: '#6b7280',
                        fontStyle: 'italic'
                      }}>Ask about their week, emotions, or activities</div>
                    </div>
                  ) : (
                    <div style={{ padding: 8 }}>
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                          marginBottom: 12,
                          alignItems: 'flex-start',
                          gap: 8
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: msg.role === 'user' ? '#3b82f6' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: 'white',
                            flexShrink: 0
                          }}>
                            {msg.role === 'user' ? '👤' : '🎓'}
                          </div>
                          
                          {/* Message Bubble */}
                          <div style={{
                            maxWidth: '75%',
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: msg.role === 'user' ? 
                              'linear-gradient(135deg, #3b82f6, #1e40af)' : 
                              'linear-gradient(135deg, #10b981, #059669)',
                            background: msg.role === 'user' ? 
                              'linear-gradient(135deg, #3b82f6, #1e40af)' : 
                              'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            fontSize: 12,
                            lineHeight: 1.4,
                            wordWrap: 'break-word',
                            position: 'relative'
                          }}>
                            <div style={{ 
                              fontSize: 11, 
                              opacity: 0.9, 
                              marginBottom: 2,
                              fontWeight: '600'
                            }}>
                              {msg.role === 'user' ? 'You' : userProfile?.display_name}
                            </div>
                            <div>{msg.content}</div>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: 8,
                          color: '#6b7280',
                          fontSize: 12
                        }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            backgroundColor: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: 'white'
                          }}>
                            🎓
                          </div>
                          <div style={{
                            padding: 8,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            borderRadius: 12,
                            fontSize: 12,
                            color: 'white'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div>Thinking</div>
                              <div style={{ display: 'flex', gap: 2 }}>
                                <div style={{ width: 4, height: 4, backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 1.4s infinite' }}></div>
                                <div style={{ width: 4, height: 4, backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 1.4s infinite 0.2s' }}></div>
                                <div style={{ width: 4, height: 4, backgroundColor: 'white', borderRadius: '50%', animation: 'pulse 1.4s infinite 0.4s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatMessagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  padding: 8,
                  backgroundColor: '#f9fafb',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb'
                }}>
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendChatMessage()
                      }
                    }}
                    placeholder="Type your message here... (Press Enter to send)"
                    disabled={!geminiApiKey.trim() || isLoading}
                    style={{
                      flex: 1,
                      padding: 8,
                      fontSize: 12,
                      border: '1px solidrgb(0, 102, 255)',
                      borderRadius: 6,
                      outline: 'none',
                      color: 'rgb(0, 102, 255)',
                      backgroundColor: 'white',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!geminiApiKey.trim() || !currentMessage.trim() || isLoading}
                    style={{
                      padding: '8px 16px',
                      fontSize: 12,
                      background: !geminiApiKey.trim() || !currentMessage.trim() || isLoading ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: !geminiApiKey.trim() || !currentMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      minWidth: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {isLoading ? '⏳' : '📤'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

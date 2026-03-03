import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const AVAILABLE_TIMES = (() => {
  const times = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return times;
})();

const generateTimeSlots = (start, end, interval, excludeLunch) => {
  const slots = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let h = startH, m = startM;
  while (h < endH || (h === endH && m < endM)) {
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (!excludeLunch || h < 12 || h >= 13) {
      slots.push(timeStr);
    }
    m += interval;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEvent, setEditingEvent] = useState(false);
  const [showMemberList, setShowMemberList] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUserDeleteConfirm, setShowUserDeleteConfirm] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);

  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regGrade, setRegGrade] = useState('B4');

  const [eventName, setEventName] = useState('');
  const [targetGrades, setTargetGrades] = useState([]);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [candidateDates, setCandidateDates] = useState([]);
  const [deadline, setDeadline] = useState('');
  const [customTimeStart, setCustomTimeStart] = useState('10:00');
  const [customTimeEnd, setCustomTimeEnd] = useState('18:00');
  const [customInterval, setCustomInterval] = useState(30);
  const [excludeLunch, setExcludeLunch] = useState(true);

  const grades = ['B3', 'B4', 'M1', 'M2', 'D1', 'D2', 'D3'];
  
  const timeSlots = [
    '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load user from localStorage
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }

      // Load shared data from server
      const response = await fetch('/api/data');
      const data = await response.json();
      setEvents(data.events || []);
      setAllUsers(data.allUsers || []);
      setActivityLogs(data.activityLogs || []);
    } catch (error) {
      console.log('Error loading data:', error);
    }
    setLoading(false);
  };

  const saveToServer = async (newEvents, newAllUsers, newLogs) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          events: newEvents !== undefined ? newEvents : events,
          allUsers: newAllUsers !== undefined ? newAllUsers : allUsers,
          activityLogs: newLogs !== undefined ? newLogs : activityLogs
        }),
      });
    } catch (error) {
      console.error('Error saving to server:', error);
    }
  };

  const addLog = async (action, detail) => {
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      userId: currentUser?.id,
      userName: currentUser?.name || '不明',
      action,
      detail
    };
    const updatedLogs = [newLog, ...activityLogs].slice(0, 100); // 最新100件まで保持
    setActivityLogs(updatedLogs);
    return updatedLogs;
  };

  const saveUser = async (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
    
    const existingIndex = allUsers.findIndex(u => u.id === user.id);
    let updatedUsers;
    if (existingIndex >= 0) {
      updatedUsers = [...allUsers];
      updatedUsers[existingIndex] = user;
    } else {
      updatedUsers = [...allUsers, user];
    }
    setAllUsers(updatedUsers);
    await saveToServer(undefined, updatedUsers);
  };

  const saveEvents = async (newEvents) => {
    setEvents(newEvents);
    await saveToServer(newEvents, undefined);
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      alert('名前を入力してください');
      return;
    }
    const user = {
      id: Date.now().toString(),
      name: regName.trim(),
      role: regRole,
      grade: regRole === 'student' ? regGrade : null
    };
    await saveUser(user);
    setCurrentView('home');
  };

  const handleGuestLogin = () => {
    const guestUser = {
      id: 'guest_' + Date.now().toString(),
      name: 'ゲスト',
      role: 'guest',
      grade: null
    };
    localStorage.setItem('currentUser', JSON.stringify(guestUser));
    setCurrentUser(guestUser);
    setCurrentView('home');
  };

  const isGuest = currentUser?.role === 'guest';

  const handleUpdateProfile = async () => {
    if (!regName.trim()) {
      alert('名前を入力してください');
      return;
    }
    const updatedUser = {
      ...currentUser,
      name: regName.trim(),
      role: regRole,
      grade: regRole === 'student' ? regGrade : null
    };
    await saveUser(updatedUser);
    setEditingProfile(false);
  };

  const startEditProfile = () => {
    setRegName(currentUser.name);
    setRegRole(currentUser.role);
    setRegGrade(currentUser.grade || 'B4');
    setEditingProfile(true);
  };

  const generateDatesFromRange = () => {
    if (!dateStart || !dateEnd) return;
    
    const start = new Date(dateStart);
    const end = new Date(dateEnd);
    
    if (start > end) {
      alert('開始日は終了日より前にしてください');
      return;
    }
    
    const dates = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    setCandidateDates(dates);
  };

  const toggleGrade = (grade) => {
    if (targetGrades.includes(grade)) {
      setTargetGrades(targetGrades.filter(g => g !== grade));
    } else {
      setTargetGrades([...targetGrades, grade]);
    }
  };

  const resetEventForm = () => {
    setEventName('');
    setTargetGrades([]);
    setDateStart('');
    setDateEnd('');
    setCandidateDates([]);
    setDeadline('');
    setCustomTimeStart('10:00');
    setCustomTimeEnd('18:00');
    setCustomInterval(30);
    setExcludeLunch(true);
  };

  const createEvent = async () => {
    if (!eventName.trim()) {
      alert('イベント名を入力してください');
      return;
    }
    if (targetGrades.length === 0) {
      alert('対象学年を選択してください');
      return;
    }
    if (candidateDates.length === 0) {
      alert('候補日を設定してください');
      return;
    }

    const newEvent = {
      id: Date.now().toString(),
      name: eventName.trim(),
      targetGrades,
      candidateDates,
      timeSlots: generateTimeSlots(customTimeStart, customTimeEnd, customInterval, excludeLunch),
      timeConfig: { start: customTimeStart, end: customTimeEnd, interval: customInterval, excludeLunch },
      deadline: deadline || null,
      responses: {},
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    const updatedEvents = [...events, newEvent];
    const newLogs = await addLog('イベント作成', `「${eventName.trim()}」を作成`);
    setEvents(updatedEvents);
    await saveToServer(updatedEvents, undefined, newLogs);
    resetEventForm();
    setCurrentView('home');
  };

  const startEditEvent = () => {
    setEventName(selectedEvent.name);
    setTargetGrades([...selectedEvent.targetGrades]);
    setCandidateDates([...selectedEvent.candidateDates]);
    setDeadline(selectedEvent.deadline || '');
    if (selectedEvent.candidateDates.length > 0) {
      setDateStart(selectedEvent.candidateDates[0]);
      setDateEnd(selectedEvent.candidateDates[selectedEvent.candidateDates.length - 1]);
    }
    if (selectedEvent.timeConfig) {
      setCustomTimeStart(selectedEvent.timeConfig.start);
      setCustomTimeEnd(selectedEvent.timeConfig.end);
      setCustomInterval(selectedEvent.timeConfig.interval);
      setExcludeLunch(selectedEvent.timeConfig.excludeLunch);
    } else {
      setCustomTimeStart('10:00');
      setCustomTimeEnd('18:00');
      setCustomInterval(30);
      setExcludeLunch(true);
    }
    setEditingEvent(true);
  };

  const updateEvent = async () => {
    if (!eventName.trim()) {
      alert('イベント名を入力してください');
      return;
    }
    if (targetGrades.length === 0) {
      alert('対象学年を選択してください');
      return;
    }
    if (candidateDates.length === 0) {
      alert('候補日を設定してください');
      return;
    }

    const updatedEvents = events.map(event => {
      if (event.id === selectedEvent.id) {
        return {
          ...event,
          name: eventName.trim(),
          targetGrades,
          candidateDates,
          deadline: deadline || null,
          timeSlots: generateTimeSlots(customTimeStart, customTimeEnd, customInterval, excludeLunch),
          timeConfig: { start: customTimeStart, end: customTimeEnd, interval: customInterval, excludeLunch },
        };
      }
      return event;
    });

    const newLogs = await addLog('イベント編集', `「${eventName.trim()}」を編集`);
    setEvents(updatedEvents);
    await saveToServer(updatedEvents, undefined, newLogs);
    setSelectedEvent(updatedEvents.find(e => e.id === selectedEvent.id));
    setEditingEvent(false);
    resetEventForm();
  };

  const cancelEditEvent = () => {
    setEditingEvent(false);
    resetEventForm();
  };

  const submitResponse = async (eventId, responses, comment) => {
    const targetEvent = events.find(e => e.id === eventId);
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        return {
          ...event,
          responses: {
            ...event.responses,
            [currentUser.id]: {
              visitorId: currentUser.id,
              userName: currentUser.name,
              userRole: currentUser.role,
              userGrade: currentUser.grade,
              answers: responses,
              comment: comment || ''
            }
          }
        };
      }
      return event;
    });
    const newLogs = await addLog('回答登録', `「${targetEvent?.name}」に回答`);
    setEvents(updatedEvents);
    await saveToServer(updatedEvents, undefined, newLogs);
    setSelectedEvent(updatedEvents.find(e => e.id === eventId));
  };

  const deleteResponse = async (eventId) => {
    const targetEvent = events.find(e => e.id === eventId);
    const updatedEvents = events.map(event => {
      if (event.id === eventId) {
        const newResponses = { ...event.responses };
        delete newResponses[currentUser.id];
        return { ...event, responses: newResponses };
      }
      return event;
    });
    const newLogs = await addLog('回答削除', `「${targetEvent?.name}」の回答を削除`);
    setEvents(updatedEvents);
    await saveToServer(updatedEvents, undefined, newLogs);
    setSelectedEvent(updatedEvents.find(e => e.id === eventId));
  };

  const calculateOptimalDates = (event) => {
    const results = [];

    // 先生が他イベントで×と回答した時間帯を収集
    const teacherUnavailableSlots = new Set();
    events.forEach(e => {
      Object.values(e.responses).forEach(response => {
        if (response.userRole === 'teacher') {
          Object.entries(response.answers || {}).forEach(([key, value]) => {
            if (value === false) {
              teacherUnavailableSlots.add(key);
            }
          });
        }
      });
    });

    const responses = Object.values(event.responses);
    const teachers = responses.filter(r => r.userRole === 'teacher');
    const targetStudents = responses.filter(r =>
      r.userRole === 'student' && event.targetGrades.includes(r.userGrade)
    );

    event.candidateDates.forEach(date => {
      event.timeSlots.forEach(slot => {
        const key = `${date}_${slot}`;

        // 先生が×と回答した時間帯かどうか
        const isTeacherUnavailable = teacherUnavailableSlots.has(key);

        const availableTeachers = teachers.filter(t => t.answers[key] === true);
        const availableStudents = targetStudents.filter(s => s.answers[key] === true);

        const studentRatio = targetStudents.length > 0
          ? availableStudents.length / targetStudents.length
          : 0;
        const studentCondition = studentRatio >= 0.8;

        // 先生が×の時間帯は候補から除外
        const meetsCriteria = studentCondition && !isTeacherUnavailable;

        results.push({
          date,
          slot,
          key,
          availableTeachers: availableTeachers.length,
          availableStudents: availableStudents.length,
          totalTargetStudents: targetStudents.length,
          studentRatio,
          studentCondition,
          isTeacherUnavailable,
          meetsCriteria,
          totalAvailable: availableTeachers.length + availableStudents.length
        });
      });
    });

    const validDates = results.filter(r => r.meetsCriteria);

    let mostParticipants = null;
    let earliest = null;

    if (validDates.length > 0) {
      mostParticipants = validDates.reduce((max, curr) =>
        curr.totalAvailable > max.totalAvailable ? curr : max
      );

      earliest = validDates.reduce((min, curr) => {
        const currDate = new Date(curr.date + 'T' + curr.slot);
        const minDate = new Date(min.date + 'T' + min.slot);
        return currDate < minDate ? curr : min;
      });
    }

    return {
      allResults: results,
      validDates,
      mostParticipants,
      earliest,
      teacherCount: teachers.length,
      studentCount: targetStudents.length
    };
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
  };

  const formatDateShort = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return (
      <div style={styles.dateLabel}>
        <span style={styles.dateNum}>{date.getMonth() + 1}/{date.getDate()}</span>
        <span style={styles.dayName}>{days[date.getDay()]}</span>
      </div>
    );
  };

  const formatDeadline = (deadlineStr) => {
    if (!deadlineStr) return null;
    const date = new Date(deadlineStr);
    const now = new Date();
    const isPast = date < now;
    return {
      text: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`,
      isPast
    };
  };

  const isEventPast = (event) => {
    if (!event.candidateDates || event.candidateDates.length === 0) return false;
    const lastDate = event.candidateDates[event.candidateDates.length - 1];
    const today = new Date().toISOString().split('T')[0];
    return lastDate < today;
  };

  const handleDeleteEvent = async () => {
    const eventName = selectedEvent.name;
    const updatedEvents = events.filter(e => e.id !== selectedEvent.id);
    const newLogs = await addLog('イベント削除', `「${eventName}」を削除`);
    setEvents(updatedEvents);
    await saveToServer(updatedEvents, undefined, newLogs);
    setShowDeleteConfirm(false);
    setCurrentView('home');
    setSelectedEvent(null);
  };

  const getUsersByGrade = () => {
    const grouped = {
      teachers: allUsers.filter(u => u.role === 'teacher'),
    };
    grades.forEach(g => {
      grouped[g] = allUsers.filter(u => u.role === 'student' && u.grade === g);
    });
    return grouped;
  };

  // 先生が×（参加不可）と回答した全時間帯を取得
  const getTeacherUnavailableSlots = () => {
    const unavailableSlots = {};

    events.forEach(event => {
      Object.values(event.responses).forEach(response => {
        if (response.userRole === 'teacher') {
          const teacherId = response.visitorId;
          if (!unavailableSlots[teacherId]) {
            unavailableSlots[teacherId] = {
              name: response.userName,
              slots: new Set()
            };
          }
          // ×（false または undefined）の時間帯を収集
          Object.entries(response.answers || {}).forEach(([key, value]) => {
            if (value === false) {
              unavailableSlots[teacherId].slots.add(key);
            }
          });
        }
      });
    });

    return unavailableSlots;
  };

  // ダブルブッキング（先生の確定日時重複）を検出
  const detectDoubleBookings = () => {
    const bookings = [];

    // 各イベントの確定日時を収集
    events.forEach(event => {
      const analysis = calculateOptimalDates(event);
      if (analysis.mostParticipants) {
        const slot = analysis.mostParticipants;
        // このイベントで参加可能（○）と回答した先生を取得
        const responses = Object.values(event.responses);
        const availableTeachers = responses.filter(r =>
          r.userRole === 'teacher' && r.answers[slot.key] === true
        );

        availableTeachers.forEach(teacher => {
          bookings.push({
            eventId: event.id,
            eventName: event.name,
            teacherId: teacher.visitorId,
            teacherName: teacher.userName,
            date: slot.date,
            time: slot.slot,
            key: slot.key
          });
        });
      }
    });

    // 同じ先生・同じ日時で複数イベントがあるものを検出
    const conflicts = [];
    const teacherSlotMap = {};

    bookings.forEach(booking => {
      const mapKey = `${booking.teacherId}_${booking.key}`;
      if (!teacherSlotMap[mapKey]) {
        teacherSlotMap[mapKey] = [];
      }
      teacherSlotMap[mapKey].push(booking);
    });

    Object.values(teacherSlotMap).forEach(bookingsAtSlot => {
      if (bookingsAtSlot.length > 1) {
        conflicts.push({
          teacherName: bookingsAtSlot[0].teacherName,
          date: bookingsAtSlot[0].date,
          time: bookingsAtSlot[0].time,
          events: bookingsAtSlot.map(b => b.eventName)
        });
      }
    });

    return conflicts;
  };

  const handleDeleteUser = async (userId) => {
    const deletedUser = allUsers.find(u => u.id === userId);
    const updatedUsers = allUsers.filter(u => u.id !== userId);
    setAllUsers(updatedUsers);

    // イベントからも該当ユーザーの回答を削除
    const updatedEvents = events.map(event => {
      const newResponses = { ...event.responses };
      delete newResponses[userId];
      return { ...event, responses: newResponses };
    });
    setEvents(updatedEvents);

    const newLogs = await addLog('ユーザー削除', `「${deletedUser?.name}」を削除`);
    await saveToServer(updatedEvents, updatedUsers, newLogs);
    setShowUserDeleteConfirm(null);
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>研究室 日程調整ツール</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={styles.container}>
          <div style={styles.loading}>読み込み中...</div>
        </div>
      </>
    );
  }

  // Registration screen
  if (!currentUser || editingProfile) {
    return (
      <>
        <Head>
          <title>研究室 日程調整ツール</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>
              {editingProfile ? 'プロフィール編集' : '研究室 日程調整ツール'}
            </h1>
            <p style={styles.subtitle}>
              {editingProfile ? '情報を更新してください' : 'まず、あなたの情報を登録してください'}
            </p>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>名前</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="山田太郎"
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>役職</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={regRole === 'teacher'}
                      onChange={() => setRegRole('teacher')}
                      style={styles.radio}
                    />
                    先生
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={regRole === 'student'}
                      onChange={() => setRegRole('student')}
                      style={styles.radio}
                    />
                    学生
                  </label>
                </div>
              </div>
              
              {regRole === 'student' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>学年</label>
                  <select
                    value={regGrade}
                    onChange={(e) => setRegGrade(e.target.value)}
                    style={styles.select}
                  >
                    {grades.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <button
                onClick={editingProfile ? handleUpdateProfile : handleRegister}
                style={styles.primaryButton}
              >
                {editingProfile ? '更新する' : '登録する'}
              </button>

              {editingProfile && (
                <button
                  onClick={() => setEditingProfile(false)}
                  style={styles.secondaryButton}
                >
                  キャンセル
                </button>
              )}

              {!editingProfile && (
                <div style={styles.guestSection}>
                  <div style={styles.divider}>
                    <span style={styles.dividerText}>または</span>
                  </div>
                  <button
                    onClick={handleGuestLogin}
                    style={styles.guestButton}
                  >
                    👁 閲覧のみ（ゲスト）
                  </button>
                  <p style={styles.guestNote}>
                    ゲストは日程の閲覧のみ可能です
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Member List Modal
  if (showMemberList) {
    const groupedUsers = getUsersByGrade();
    return (
      <>
        <Head>
          <title>メンバー一覧 | 研究室 日程調整ツール</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>登録メンバー一覧</h1>
            <p style={styles.subtitle}>登録済み: {allUsers.length}人</p>
            
            {groupedUsers.teachers.length > 0 && (
              <div style={styles.memberSection}>
                <h3 style={styles.memberSectionTitle}>👨‍🏫 先生（{groupedUsers.teachers.length}人）</h3>
                <div style={styles.memberGrid}>
                  {groupedUsers.teachers.map(u => (
                    <div key={u.id} style={isGuest ? styles.memberCard : styles.memberCardWithDelete}>
                      <span>{u.name}</span>
                      {!isGuest && (
                        <button
                          onClick={() => setShowUserDeleteConfirm(u)}
                          style={styles.memberDeleteButton}
                          title="このユーザーを削除"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {grades.map(g => (
              groupedUsers[g].length > 0 && (
                <div key={g} style={styles.memberSection}>
                  <h3 style={styles.memberSectionTitle}>🎓 {g}（{groupedUsers[g].length}人）</h3>
                  <div style={styles.memberGrid}>
                    {groupedUsers[g].map(u => (
                      <div key={u.id} style={isGuest ? styles.memberCard : styles.memberCardWithDelete}>
                        <span>{u.name}</span>
                        {!isGuest && (
                          <button
                            onClick={() => setShowUserDeleteConfirm(u)}
                            style={styles.memberDeleteButton}
                            title="このユーザーを削除"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {showUserDeleteConfirm && (
              <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                  <h3 style={styles.modalTitle}>ユーザーを削除しますか？</h3>
                  <p style={styles.modalText}>
                    「{showUserDeleteConfirm.name}」を削除します。
                    このユーザーのイベント回答もすべて削除されます。
                  </p>
                  <div style={styles.modalButtons}>
                    <button onClick={() => setShowUserDeleteConfirm(null)} style={styles.secondaryButtonSmall}>
                      キャンセル
                    </button>
                    <button onClick={() => handleDeleteUser(showUserDeleteConfirm.id)} style={styles.deleteButton}>
                      削除する
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {allUsers.length === 0 && (
              <p style={styles.emptyText}>まだメンバーが登録されていません</p>
            )}
            
            <button
              onClick={() => setShowMemberList(false)}
              style={styles.secondaryButton}
            >
              閉じる
            </button>
          </div>
        </div>
      </>
    );
  }

  // Event creation / editing screen
  if (currentView === 'createEvent' || editingEvent) {
    return (
      <>
        <Head>
          <title>{editingEvent ? 'イベント編集' : '新規イベント作成'} | 研究室 日程調整ツール</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>
              {editingEvent ? 'イベント編集' : '新規イベント作成'}
            </h1>
            
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>イベント名</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="例：B4卒論発表練習"
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>対象学年（複数選択可）</label>
                <div style={styles.gradeGrid}>
                  {grades.map(g => (
                    <button
                      key={g}
                      onClick={() => toggleGrade(g)}
                      style={{
                        ...styles.gradeButton,
                        ...(targetGrades.includes(g) ? styles.gradeButtonActive : {})
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>候補日の範囲</label>
                <div style={styles.dateRangeRow}>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    style={styles.dateInput}
                  />
                  <span style={styles.dateSeparator}>〜</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    style={styles.dateInput}
                  />
                  <button onClick={generateDatesFromRange} style={styles.generateButton}>
                    日程を生成
                  </button>
                </div>
                
                {candidateDates.length > 0 && (
                  <div style={styles.datePreview}>
                    <span style={styles.previewLabel}>選択された日程:</span>
                    <span style={styles.previewText}>
                      {formatDate(candidateDates[0])} 〜 {formatDate(candidateDates[candidateDates.length - 1])}
                      （{candidateDates.length}日間）
                    </span>
                  </div>
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>回答締切日（目安）</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={styles.dateInput}
                />
                <p style={styles.hintSmall}>※締切後も回答可能です</p>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>時間帯</label>
                <div style={styles.timeSettingsRow}>
                  <select
                    value={customTimeStart}
                    onChange={(e) => setCustomTimeStart(e.target.value)}
                    style={styles.timeSelect}
                  >
                    {AVAILABLE_TIMES.filter(t => t < customTimeEnd).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span style={styles.dateSeparator}>〜</span>
                  <select
                    value={customTimeEnd}
                    onChange={(e) => setCustomTimeEnd(e.target.value)}
                    style={styles.timeSelect}
                  >
                    {AVAILABLE_TIMES.filter(t => t > customTimeStart).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.timeOptionsRow}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={customInterval === 30}
                      onChange={() => setCustomInterval(30)}
                      style={styles.radio}
                    />
                    30分刻み
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio"
                      checked={customInterval === 60}
                      onChange={() => setCustomInterval(60)}
                      style={styles.radio}
                    />
                    1時間刻み
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={excludeLunch}
                      onChange={(e) => setExcludeLunch(e.target.checked)}
                      style={styles.checkbox}
                    />
                    昼休み除く（12:00-13:00）
                  </label>
                </div>
                <div style={styles.timePreview}>
                  {(() => {
                    const slots = generateTimeSlots(customTimeStart, customTimeEnd, customInterval, excludeLunch);
                    return `${slots.join('、')}（${slots.length}コマ）`;
                  })()}
                </div>
              </div>
              
              <button 
                onClick={editingEvent ? updateEvent : createEvent} 
                style={styles.primaryButton}
              >
                {editingEvent ? 'イベントを更新' : 'イベントを作成'}
              </button>
              <button
                onClick={() => {
                  if (editingEvent) {
                    cancelEditEvent();
                  } else {
                    resetEventForm();
                    setCurrentView('home');
                  }
                }}
                style={styles.secondaryButton}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Event detail screen
  if (currentView === 'eventDetail' && selectedEvent) {
    const analysis = calculateOptimalDates(selectedEvent);
    const userResponse = selectedEvent.responses[currentUser.id];
    const isTargetUser = !isGuest && (currentUser.role === 'teacher' ||
      selectedEvent.targetGrades.includes(currentUser.grade));
    const deadlineInfo = formatDeadline(selectedEvent.deadline);
    
    return (
      <>
        <Head>
          <title>{selectedEvent.name} | 研究室 日程調整ツール</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={styles.container}>
          <div style={styles.cardWide}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>{selectedEvent.name}</h1>
                <p style={styles.meta}>
                  対象: {selectedEvent.targetGrades.join(', ')} ／ 
                  作成者: {selectedEvent.createdByName}
                </p>
                {deadlineInfo && (
                  <p style={{
                    ...styles.deadlineText,
                    ...(deadlineInfo.isPast ? styles.deadlinePast : {})
                  }}>
                    📅 回答締切: {deadlineInfo.text}
                    {deadlineInfo.isPast && ' （締切を過ぎています）'}
                  </p>
                )}
              </div>
              {!isGuest && (
                <div style={styles.headerButtons}>
                  <button onClick={startEditEvent} style={styles.editButton}>
                    編集
                  </button>
                  <button onClick={() => setShowDeleteConfirm(true)} style={styles.deleteButton}>
                    削除
                  </button>
                </div>
              )}
            </div>
            
            {showDeleteConfirm && (
              <div style={styles.modalOverlay}>
                <div style={styles.modal}>
                  <h3 style={styles.modalTitle}>イベントを削除しますか？</h3>
                  <p style={styles.modalText}>「{selectedEvent.name}」を削除します。この操作は取り消せません。</p>
                  <div style={styles.modalButtons}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={styles.secondaryButtonSmall}>
                      キャンセル
                    </button>
                    <button onClick={handleDeleteEvent} style={styles.deleteButton}>
                      削除する
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div style={styles.resultSection}>
              <h2 style={styles.sectionTitle}>📊 判定結果</h2>
              <p style={styles.statusText}>
                回答状況: 先生 {analysis.teacherCount}/3人, 
                対象学生 {analysis.studentCount}人
              </p>
              
              {analysis.teacherCount < 3 && (
                <div style={styles.infoBox}>
                  ℹ️ 先生の回答: {analysis.teacherCount}/3人
                </div>
              )}
              
              {analysis.validDates.length > 0 ? (
                <div style={styles.resultBox}>
                  <div style={styles.resultItem}>
                    <span style={styles.resultLabel}>🎯 参加人数最多</span>
                    <span style={styles.resultValue}>
                      {formatDate(analysis.mostParticipants.date)} {analysis.mostParticipants.slot}〜
                    </span>
                    <span style={styles.resultDetail}>
                      （先生{analysis.mostParticipants.availableTeachers}人 + 
                      学生{analysis.mostParticipants.availableStudents}/{analysis.mostParticipants.totalTargetStudents}人）
                    </span>
                  </div>
                  <div style={styles.resultItem}>
                    <span style={styles.resultLabel}>📅 最も早い日程</span>
                    <span style={styles.resultValue}>
                      {formatDate(analysis.earliest.date)} {analysis.earliest.slot}〜
                    </span>
                    <span style={styles.resultDetail}>
                      （先生{analysis.earliest.availableTeachers}人 + 
                      学生{analysis.earliest.availableStudents}/{analysis.earliest.totalTargetStudents}人）
                    </span>
                  </div>
                </div>
              ) : (
                <div style={styles.noResultBox}>
                  条件を満たす日程がまだありません。
                  <br />
                  <small>（対象学生8割以上の参加が必要）</small>
                </div>
              )}
            </div>
            
            {isTargetUser && (
              <DragSelectForm
                event={selectedEvent}
                currentUser={currentUser}
                existingResponse={userResponse}
                onSubmit={submitResponse}
                onDelete={deleteResponse}
                formatDateShort={formatDateShort}
                timeSlots={selectedEvent.timeSlots || timeSlots}
                analysisResults={analysis.allResults}
              />
            )}
            
            {!isTargetUser && (
              <div style={styles.notTargetSection}>
                <div style={styles.notTargetBox}>
                  このイベントはあなたの学年（{currentUser.grade}）は対象外です。
                </div>
                <div style={styles.candidateDatesSection}>
                  <h3 style={styles.candidateDatesTitle}>候補日一覧</h3>
                  <div style={styles.candidateDatesGrid}>
                    {selectedEvent.candidateDates.map(date => (
                      <div key={date} style={styles.candidateDateCard}>
                        {formatDate(date)}
                      </div>
                    ))}
                  </div>
                  <p style={styles.candidateDatesTime}>
                    時間帯: {selectedEvent.timeSlots[0]} 〜 {selectedEvent.timeSlots[selectedEvent.timeSlots.length - 1]}
                  </p>
                </div>
              </div>
            )}
            
            <div style={styles.responseSection}>
              <h2 style={styles.sectionTitle}>📝 回答一覧</h2>
              <ResponseTable
                event={selectedEvent}
                formatDateShort={formatDateShort}
                timeSlots={selectedEvent.timeSlots || timeSlots}
                grades={grades}
              />
            </div>
            
            <button
              onClick={() => {
                setCurrentView('home');
                setSelectedEvent(null);
              }}
              style={styles.secondaryButton}
            >
              一覧に戻る
            </button>
          </div>
        </div>
      </>
    );
  }

  // Home screen
  return (
    <>
      <Head>
        <title>研究室 日程調整ツール</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>研究室 日程調整ツール</h1>
          
          <div style={styles.userInfo}>
            <span>
              {isGuest ? (
                <span style={styles.guestBadge}>👁 ゲスト（閲覧のみ）</span>
              ) : (
                `${currentUser.name}（${currentUser.role === 'teacher' ? '先生' : currentUser.grade}）`
              )}
            </span>
            {!isGuest && (
              <button onClick={startEditProfile} style={styles.linkButton}>
                編集
              </button>
            )}
            {isGuest && (
              <button
                onClick={() => {
                  localStorage.removeItem('currentUser');
                  setCurrentUser(null);
                }}
                style={styles.linkButton}
              >
                ログアウト
              </button>
            )}
          </div>

          <div style={styles.buttonRow}>
            {!isGuest && (
              <button
                onClick={() => setCurrentView('createEvent')}
                style={styles.primaryButton}
              >
                ＋ 新規イベント作成
              </button>
            )}
            <button
              onClick={() => setShowMemberList(true)}
              style={styles.outlineButton}
            >
              👥 メンバー一覧
            </button>
          </div>
          
          <h2 style={styles.sectionTitle}>イベント一覧</h2>

          {/* ダブルブッキング警告 */}
          {(() => {
            const conflicts = detectDoubleBookings();
            if (conflicts.length === 0) return null;
            return (
              <div style={styles.conflictWarningBox}>
                <div style={styles.conflictWarningTitle}>日程重複の検出</div>
                {conflicts.map((conflict, idx) => (
                  <div key={idx} style={styles.conflictItem}>
                    <span style={styles.conflictTeacher}>{conflict.teacherName}</span>
                    <span style={styles.conflictDetail}>
                      {formatDate(conflict.date)} {conflict.time}~：
                      {conflict.events.join('、')}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

          {events.length === 0 ? (
            <p style={styles.emptyText}>まだイベントがありません</p>
          ) : (
            <div style={styles.eventList}>
              {[...events].sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                return dateB - dateA;
              }).map(event => {
                const analysis = calculateOptimalDates(event);
                const hasResponded = !!event.responses[currentUser.id];
                const isTarget = currentUser.role === 'teacher' ||
                  event.targetGrades.includes(currentUser.grade);
                const deadlineInfo = formatDeadline(event.deadline);
                const past = isEventPast(event);

                return (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setCurrentView('eventDetail');
                    }}
                    style={{
                      ...styles.eventCard,
                      ...(past ? { opacity: 0.6 } : {})
                    }}
                  >
                    <div style={styles.eventHeader}>
                      <span style={{
                        ...styles.eventName,
                        ...(past ? { textDecoration: 'line-through', color: '#999' } : {})
                      }}>{event.name}</span>
                      {isTarget && (
                        <span style={{
                          ...styles.badge,
                          ...(hasResponded ? styles.badgeResponded : styles.badgePending)
                        }}>
                          {hasResponded ? '回答済' : '未回答'}
                        </span>
                      )}
                    </div>
                    <div style={styles.eventMeta}>
                      対象: {event.targetGrades.join(', ')} ／ 
                      回答: {Object.keys(event.responses).length}人
                      {deadlineInfo && (
                        <span style={deadlineInfo.isPast ? styles.deadlineSmallPast : styles.deadlineSmall}>
                          ／ 締切: {deadlineInfo.text}
                        </span>
                      )}
                    </div>
                    {analysis.validDates.length > 0 && (
                      <div style={styles.eventResult}>
                        ✅ 開催可能日あり: {formatDate(analysis.mostParticipants.date)} {analysis.mostParticipants.slot}〜
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 操作履歴 */}
          <h2 style={styles.sectionTitle}>操作履歴</h2>
          {activityLogs.length === 0 ? (
            <p style={styles.emptyText}>まだ操作履歴がありません</p>
          ) : (
            <div style={styles.logList}>
              {activityLogs.slice(0, showAllLogs ? 20 : 3).map(log => (
                <div key={log.id} style={styles.logItem}>
                  <div style={styles.logHeader}>
                    <span style={styles.logAction}>{log.action}</span>
                    <span style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleString('ja-JP', {
                        month: 'numeric', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div style={styles.logDetail}>
                    {log.userName}：{log.detail}
                  </div>
                </div>
              ))}
              {activityLogs.length > 3 && (
                <button
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  style={styles.logToggleButton}
                >
                  {showAllLogs ? '▲ 閉じる' : `▼ 過去の履歴を表示（残り${Math.min(activityLogs.length - 3, 17)}件）`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Drag Select Response Form Component
function DragSelectForm({ event, currentUser, existingResponse, onSubmit, onDelete, formatDateShort, timeSlots, analysisResults }) {
  const [answers, setAnswers] = useState(existingResponse?.answers || {});
  const [comment, setComment] = useState(existingResponse?.comment || '');
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null);
  const [draggedCells, setDraggedCells] = useState(new Set());
  const [showDeleteResponseConfirm, setShowDeleteResponseConfirm] = useState(false);
  const tableRef = useRef(null);

  const teacherCountMap = {};
  analysisResults?.forEach(r => {
    teacherCountMap[r.key] = r.availableTeachers;
  });

  const getTeacherIndicator = (key) => {
    const count = teacherCountMap[key] || 0;
    if (count === 3) return { emoji: '👨‍🏫³', style: styles.teacherFull };
    if (count === 2) return { emoji: '👨‍🏫²', style: styles.teacherTwo };
    if (count === 1) return { emoji: '👨‍🏫¹', style: styles.teacherOne };
    return { emoji: '', style: {} };
  };

  const handleMouseDown = (key, currentValue) => {
    setIsDragging(true);
    const newValue = !currentValue;
    setDragValue(newValue);
    setDraggedCells(new Set([key]));
    setAnswers(prev => ({ ...prev, [key]: newValue }));
  };

  const handleMouseEnter = (key) => {
    if (isDragging && dragValue !== null) {
      setDraggedCells(prev => new Set([...prev, key]));
      setAnswers(prev => ({ ...prev, [key]: dragValue }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragValue(null);
    setDraggedCells(new Set());
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging]);

  const handleSubmit = () => {
    onSubmit(event.id, answers, comment);
    alert('回答を保存しました');
  };

  const handleDelete = () => {
    onDelete(event.id);
    setShowDeleteResponseConfirm(false);
    setAnswers({});
    setComment('');
    alert('回答を削除しました');
  };
  
  return (
    <div style={styles.responseForm}>
      <h2 style={styles.sectionTitle}>あなたの回答</h2>
      <p style={styles.hint}>
        ○ = 参加可能 ／ クリック&ドラッグで複数選択 ／ 👨‍🏫 = 参加可能な先生の数
      </p>
      
      <div 
        style={styles.scheduleTableWrapper}
        ref={tableRef}
        onMouseLeave={() => isDragging && handleMouseUp()}
      >
        <table style={styles.scheduleTable}>
          <thead>
            <tr>
              <th style={styles.cornerCell}></th>
              {event.candidateDates.map(date => (
                <th key={date} style={styles.dateHeaderCell}>
                  {formatDateShort(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(slot => (
              <tr key={slot}>
                <td style={styles.timeHeaderCell}>{slot}~</td>
                {event.candidateDates.map(date => {
                  const key = `${date}_${slot}`;
                  const isAvailable = answers[key];
                  const isBeingDragged = draggedCells.has(key);
                  const teacherInfo = getTeacherIndicator(key);
                  return (
                    <td
                      key={key}
                      onMouseDown={() => handleMouseDown(key, isAvailable)}
                      onMouseEnter={() => handleMouseEnter(key)}
                      style={{
                        ...styles.answerCell,
                        ...(isAvailable ? styles.answerYes : styles.answerNo),
                        ...(isBeingDragged ? styles.answerDragging : {}),
                        ...teacherInfo.style
                      }}
                    >
                      <div style={styles.cellContent}>
                        <span>{isAvailable ? '○' : '×'}</span>
                        {teacherInfo.emoji && (
                          <span style={styles.teacherBadge}>{teacherInfo.emoji}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={styles.commentSection}>
        <label style={styles.label}>コメント（任意）</label>
        <div style={styles.commentInputRow}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="例：この日は午後から参加可能です"
            style={styles.textareaFlex}
            rows={2}
          />
          {comment && (
            <button
              onClick={() => setComment('')}
              style={styles.clearCommentButton}
              title="コメントを削除"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div style={styles.responseButtonRow}>
        <button onClick={handleSubmit} style={styles.primaryButton}>
          回答を保存
        </button>
        {existingResponse && (
          <button
            onClick={() => setShowDeleteResponseConfirm(true)}
            style={styles.deleteResponseButton}
          >
            回答を削除
          </button>
        )}
      </div>

      {showDeleteResponseConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>回答を削除しますか？</h3>
            <p style={styles.modalText}>この操作は取り消せません。</p>
            <div style={styles.modalButtons}>
              <button onClick={() => setShowDeleteResponseConfirm(false)} style={styles.secondaryButtonSmall}>
                キャンセル
              </button>
              <button onClick={handleDelete} style={styles.deleteButton}>
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Response Table Component
function ResponseTable({ event, formatDateShort, timeSlots, grades }) {
  const responses = Object.values(event.responses);
  
  if (responses.length === 0) {
    return <p style={styles.emptyText}>まだ回答がありません</p>;
  }
  
  const teachers = responses.filter(r => r.userRole === 'teacher');
  const studentsByGrade = {};
  grades.forEach(g => {
    studentsByGrade[g] = responses.filter(r => r.userRole === 'student' && r.userGrade === g);
  });
  
  const renderResponseRow = (r) => (
    <tr key={r.visitorId || r.oderId}>
      <td style={styles.nameCell}>
        <div style={styles.nameCellInner}>
          <span>
            {r.userName}
            {r.userGrade && <span style={styles.gradeTag}>{r.userGrade}</span>}
          </span>
          {r.comment && (
            <span style={styles.commentBubble} title={r.comment}>
              💬
            </span>
          )}
        </div>
      </td>
      {event.candidateDates.map(date => (
        timeSlots.map((slot, slotIdx) => {
          const key = `${date}_${slot}`;
          const isAvailable = r.answers[key];
          return (
            <td
              key={key}
              style={{
                ...styles.responseCell,
                ...(isAvailable ? styles.cellYes : styles.cellNo),
                ...(slotIdx === 0 ? styles.dateSeparatorLeft : {})
              }}
            >
              {isAvailable ? '○' : '×'}
            </td>
          );
        })
      ))}
    </tr>
  );
  
  const renderGroupHeader = (title) => (
    <tr>
      <td 
        colSpan={1 + event.candidateDates.length * timeSlots.length} 
        style={styles.groupLabel}
      >
        {title}
      </td>
    </tr>
  );
  
  const respondentsWithComments = responses.filter(r => r.comment);
  
  return (
    <div>
      <div style={styles.responseTableWrapper}>
        <table style={styles.responseTable}>
          <thead>
            <tr>
              <th style={styles.cornerCell}>名前</th>
              {event.candidateDates.map((date, dateIdx) => (
                <th
                  key={date}
                  colSpan={timeSlots.length}
                  style={{
                    ...styles.dateGroupHeader,
                    ...(dateIdx > 0 ? styles.dateSeparatorLeft : {})
                  }}
                >
                  {formatDateShort(date)}
                </th>
              ))}
            </tr>
            <tr>
              <th style={styles.cornerCell}></th>
              {event.candidateDates.map(date => (
                timeSlots.map((slot, slotIdx) => (
                  <th key={`${date}_${slot}`} style={{
                    ...styles.timeSubHeader,
                    ...(slotIdx === 0 ? styles.dateSeparatorLeft : {})
                  }}>
                    {slot.slice(0, 2)}
                  </th>
                ))
              ))}
            </tr>
          </thead>
          <tbody>
            {teachers.length > 0 && (
              <>
                {renderGroupHeader(`👨‍🏫 先生（${teachers.length}人）`)}
                {teachers.map(renderResponseRow)}
              </>
            )}
            
            {grades.map(g => (
              studentsByGrade[g].length > 0 && (
                <React.Fragment key={g}>
                  {renderGroupHeader(`🎓 ${g}（${studentsByGrade[g].length}人）`)}
                  {studentsByGrade[g].map(renderResponseRow)}
                </React.Fragment>
              )
            ))}
          </tbody>
        </table>
      </div>
      
      {respondentsWithComments.length > 0 && (
        <div style={styles.commentsSection}>
          <h3 style={styles.commentsSectionTitle}>💬 コメント</h3>
          {respondentsWithComments.map(r => (
            <div key={r.visitorId || r.oderId} style={styles.commentItem}>
              <span style={styles.commentAuthor}>
                {r.userName}
                {r.userGrade && <span style={styles.gradeTagSmall}>{r.userGrade}</span>}
              </span>
              <span style={styles.commentText}>{r.comment}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: '"Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif',
  },
  loading: {
    color: 'white',
    textAlign: 'center',
    paddingTop: '100px',
    fontSize: '18px',
  },
  card: {
    maxWidth: '700px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  cardWide: {
    maxWidth: '1200px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    color: '#666',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  headerButtons: {
    display: 'flex',
    gap: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontWeight: '600',
    color: '#333',
    fontSize: '14px',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
  },
  textarea: {
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  select: {
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
  },
  radioGroup: {
    display: 'flex',
    gap: '24px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  radio: {
    width: '18px',
    height: '18px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  primaryButton: {
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '14px 24px',
    background: 'white',
    color: '#666',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  secondaryButtonSmall: {
    padding: '8px 16px',
    background: 'white',
    color: '#666',
    border: '2px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  guestSection: {
    marginTop: '24px',
    textAlign: 'center',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '16px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#999',
    fontSize: '13px',
    position: 'relative',
  },
  guestButton: {
    width: '100%',
    padding: '12px 24px',
    background: '#f5f5f5',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  guestNote: {
    fontSize: '12px',
    color: '#999',
    marginTop: '8px',
  },
  guestBadge: {
    color: '#888',
    fontSize: '14px',
  },
  outlineButton: {
    padding: '14px 24px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  editButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 16px',
    background: '#ff4757',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'underline',
  },
  userInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  gradeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  gradeButton: {
    padding: '10px 20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  gradeButtonActive: {
    background: '#667eea',
    color: 'white',
    borderColor: '#667eea',
  },
  dateRangeRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dateInput: {
    padding: '10px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
  },
  dateSeparator: {
    color: '#666',
    padding: '0 4px',
  },
  generateButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  datePreview: {
    marginTop: '12px',
    padding: '12px 16px',
    background: '#e8f0fe',
    borderRadius: '8px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  previewLabel: {
    fontSize: '13px',
    color: '#666',
  },
  previewText: {
    fontSize: '14px',
    color: '#1a73e8',
    fontWeight: '600',
  },
  timePreview: {
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    color: '#666',
    fontSize: '14px',
  },
  hintSmall: {
    fontSize: '12px',
    color: '#888',
    marginTop: '4px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    margin: '24px 0 16px 0',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    padding: '40px',
  },
  conflictWarningBox: {
    background: '#fff8e6',
    border: '1px solid #f0d58c',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  conflictWarningTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#8a6d3b',
    marginBottom: '8px',
  },
  conflictItem: {
    fontSize: '13px',
    color: '#666',
    padding: '4px 0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  conflictTeacher: {
    fontWeight: '600',
    color: '#8a6d3b',
  },
  conflictDetail: {
    color: '#666',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  logItem: {
    padding: '10px 12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '3px solid #ddd',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  logAction: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1a73e8',
    background: '#e8f0fe',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  logTime: {
    fontSize: '12px',
    color: '#999',
  },
  logDetail: {
    fontSize: '13px',
    color: '#555',
  },
  logToggleButton: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px dashed #ccc',
    borderRadius: '8px',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  eventCard: {
    padding: '16px',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  eventName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  eventMeta: {
    fontSize: '13px',
    color: '#666',
  },
  eventResult: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#00a86b',
    fontWeight: '600',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgeResponded: {
    background: '#d4edda',
    color: '#155724',
  },
  badgePending: {
    background: '#fff3cd',
    color: '#856404',
  },
  meta: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '0',
  },
  deadlineText: {
    color: '#666',
    fontSize: '13px',
    marginTop: '4px',
  },
  deadlinePast: {
    color: '#dc3545',
  },
  deadlineSmall: {
    color: '#666',
  },
  deadlineSmallPast: {
    color: '#dc3545',
  },
  resultSection: {
    background: '#f8f9fa',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  statusText: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '12px',
  },
  infoBox: {
    background: '#e8f0fe',
    color: '#1a73e8',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  resultBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resultItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  resultLabel: {
    fontSize: '14px',
    color: '#666',
  },
  resultValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a2e',
  },
  resultDetail: {
    fontSize: '13px',
    color: '#888',
  },
  noResultBox: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
    background: 'white',
    borderRadius: '8px',
  },
  notTargetBox: {
    padding: '16px',
    background: '#f0f0f0',
    borderRadius: '8px',
    color: '#666',
    textAlign: 'center',
  },
  notTargetSection: {
    marginBottom: '24px',
  },
  candidateDatesSection: {
    marginTop: '16px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  candidateDatesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  candidateDatesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  candidateDateCard: {
    padding: '8px 12px',
    background: '#e8f0fe',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1a73e8',
    fontWeight: '500',
  },
  candidateDatesTime: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  responseForm: {
    marginBottom: '24px',
  },
  hint: {
    fontSize: '13px',
    color: '#888',
    marginBottom: '12px',
  },
  scheduleTableWrapper: {
    overflowX: 'auto',
    marginBottom: '16px',
    userSelect: 'none',
  },
  scheduleTable: {
    borderCollapse: 'collapse',
    width: '100%',
  },
  cornerCell: {
    padding: '8px',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    position: 'sticky',
    left: 0,
    zIndex: 1,
    minWidth: '60px',
  },
  dateHeaderCell: {
    padding: '8px 4px',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
    minWidth: '60px',
  },
  dateLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  dateNum: {
    fontSize: '13px',
    fontWeight: '600',
  },
  dayName: {
    fontSize: '11px',
    color: '#888',
  },
  timeHeaderCell: {
    padding: '8px 12px',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: '600',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  },
  answerCell: {
    padding: '12px 8px',
    textAlign: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '700',
    border: '1px solid #e0e0e0',
    minWidth: '50px',
  },
  answerYes: {
    background: '#d4edda',
    color: '#155724',
  },
  answerNo: {
    background: '#f8d7da',
    color: '#721c24',
  },
  answerDragging: {
    boxShadow: 'inset 0 0 0 2px #667eea',
  },
  cellContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  teacherBadge: {
    fontSize: '10px',
    lineHeight: '1',
  },
  teacherFull: {
    boxShadow: 'inset 0 0 0 3px #4CAF50',
  },
  teacherTwo: {
    boxShadow: 'inset 0 0 0 3px #FF9800',
  },
  teacherOne: {
    boxShadow: 'inset 0 0 0 3px #9E9E9E',
  },
  commentSection: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  commentInputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  textareaFlex: {
    flex: 1,
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
  },
  clearCommentButton: {
    background: '#ff4757',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  responseButtonRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  deleteResponseButton: {
    padding: '14px 24px',
    background: 'white',
    color: '#ff4757',
    border: '2px solid #ff4757',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  responseSection: {
    marginTop: '24px',
  },
  responseTableWrapper: {
    overflowX: 'auto',
  },
  responseTable: {
    borderCollapse: 'collapse',
    width: '100%',
    fontSize: '12px',
  },
  dateGroupHeader: {
    padding: '6px 4px',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
  },
  timeSubHeader: {
    padding: '4px 2px',
    background: '#f8f9fa',
    border: '1px solid #e0e0e0',
    textAlign: 'center',
    fontSize: '10px',
    color: '#888',
    minWidth: '24px',
  },
  nameCell: {
    padding: '8px',
    border: '1px solid #e0e0e0',
    background: 'white',
    position: 'sticky',
    left: 0,
    zIndex: 1,
    whiteSpace: 'nowrap',
    fontSize: '13px',
  },
  nameCellInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  responseCell: {
    padding: '4px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    fontSize: '11px',
    minWidth: '24px',
  },
  cellYes: {
    background: '#d4edda',
    color: '#155724',
  },
  cellNo: {
    background: '#f8d7da',
    color: '#721c24',
  },
  groupLabel: {
    padding: '8px',
    background: '#f8f9fa',
    fontWeight: '600',
    fontSize: '13px',
    color: '#666',
    border: '1px solid #e0e0e0',
  },
  gradeTag: {
    fontSize: '10px',
    background: '#e0e0e0',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#666',
    marginLeft: '6px',
  },
  gradeTagSmall: {
    fontSize: '10px',
    background: '#e0e0e0',
    padding: '1px 4px',
    borderRadius: '3px',
    color: '#666',
    marginLeft: '4px',
  },
  commentBubble: {
    cursor: 'help',
    fontSize: '14px',
  },
  commentsSection: {
    marginTop: '20px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  commentsSectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  commentItem: {
    display: 'flex',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #e0e0e0',
    flexWrap: 'wrap',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#333',
    minWidth: '100px',
  },
  commentText: {
    fontSize: '13px',
    color: '#666',
  },
  memberSection: {
    marginBottom: '24px',
  },
  memberSectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  memberGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  memberCard: {
    padding: '8px 16px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
  },
  memberCardWithDelete: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#333',
  },
  memberDeleteButton: {
    background: 'transparent',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px',
    lineHeight: 1,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  timeSettingsRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  timeSelect: {
    padding: '10px 12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white',
  },
  timeOptionsRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginTop: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
  },
  dateSeparatorLeft: {
    borderLeft: '2.5px solid #999',
  },
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle2, Circle, Clock, Target, Eye, 
  BarChart3, Settings, AlertTriangle, Plus, 
  Calendar, Sunrise, Moon, ChevronRight, Check, ChevronDown
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- Firebase Init ---
let app, auth, db, appId;
try {
  const firebaseConfig = JSON.parse(__firebase_config);
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  console.error("Firebase init error", e);
}

// --- Utilities ---
const getTodayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const getNextDayStr = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const defaultCategories = {
  Work: ['Career Coaching', 'Life Coaching', 'Social Media'],
  Wellness: ['Social', 'Physical', 'Spiritual'],
  Learning: ['Reading', 'Courses'],
  Household: ['General Chores', 'Admin']
};

const categoryTheme = {
  Work: { bg: 'bg-blue-50/70', border: 'border-blue-100', text: 'text-blue-700', badgeBg: 'bg-blue-200/50', hex: '#93c5fd' },
  Wellness: { bg: 'bg-emerald-50/70', border: 'border-emerald-100', text: 'text-emerald-700', badgeBg: 'bg-emerald-200/50', hex: '#6ee7b7' },
  Learning: { bg: 'bg-amber-50/70', border: 'border-amber-100', text: 'text-amber-700', badgeBg: 'bg-amber-200/50', hex: '#fcd34d' },
  Household: { bg: 'bg-violet-50/70', border: 'border-violet-100', text: 'text-violet-700', badgeBg: 'bg-violet-200/50', hex: '#c4b5fd' },
  Default: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700', badgeBg: 'bg-slate-200', hex: '#cbd5e1' }
};

// Custom Hook for Firebase Storage
function useFirebaseStorage(user, docName, initialValue) {
  const [data, setData] = useState(initialValue);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'appData', docName);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setData(docSnap.data().value);
      } else {
        // First time setup for this document
        setDoc(docRef, { value: initialValue }, { merge: true });
        setData(initialValue);
      }
      setInitialized(true);
    }, (err) => {
      console.error("Snapshot error:", err);
      setInitialized(true); 
    });

    return () => unsubscribe();
  }, [user, docName]);

  const updateData = (newValue) => {
    const toSave = typeof newValue === 'function' ? newValue(data) : newValue;
    setData(toSave);
    if (!user || !db) return;
    const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'appData', docName);
    setDoc(docRef, { value: toSave }, { merge: true }).catch(console.error);
  };

  return [data, updateData, initialized];
}

// --- Custom UI Components ---
function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

const CustomSelect = ({ value, options, onChange, theme = 'slate', name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  useOnClickOutside(ref, () => setIsOpen(false));

  const themes = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 focus:ring-indigo-500/10 focus:border-indigo-400',
    teal: 'bg-teal-50 text-teal-700 border-teal-200 hover:border-teal-300 focus:ring-teal-500/10 focus:border-teal-400',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 focus:ring-emerald-500/10 focus:border-emerald-400'
  };
  
  const themeClass = themes[theme] || themes.slate;
  const hoverBg = theme === 'emerald' ? 'hover:bg-emerald-50 hover:text-emerald-700' : theme === 'teal' ? 'hover:bg-teal-50 hover:text-teal-700' : 'hover:bg-slate-100 hover:text-slate-900';
  const activeBg = theme === 'emerald' ? 'bg-emerald-50/50 text-emerald-700' : theme === 'teal' ? 'bg-teal-50/50 text-teal-700' : 'bg-slate-100 text-slate-900';

  return (
    <div className="relative w-full text-sm" ref={ref}>
      {name && <input type="hidden" name={name} value={value} />}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-3 font-semibold rounded-xl border cursor-pointer flex justify-between items-center transition-all shadow-sm ${themeClass} ${isOpen ? 'ring-4 bg-white' : ''}`}
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {options.map(opt => (
            <div 
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`p-3 cursor-pointer text-slate-700 font-medium transition-colors ${hoverBg} ${value === opt ? activeBg : ''}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomCombobox = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  useOnClickOutside(ref, () => setIsOpen(false));

  const filteredOptions = value 
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  return (
    <div className="relative w-full text-sm" ref={ref}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full p-3 pr-10 bg-slate-50 text-slate-700 font-semibold placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm cursor-text"
      />
      <div 
        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
         <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {filteredOptions.map(opt => (
            <div 
              key={opt}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`p-3 cursor-pointer text-slate-700 font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 ${value === opt ? 'bg-slate-100 text-slate-900' : ''}`}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Application Component ---
export default function VisionFlow() {
  const [activeTab, setActiveTab] = useState('daily');
  const actualTodayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(actualTodayStr);
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  const [selectedMainCat, setSelectedMainCat] = useState('Work'); // For form UI
  const dateInputRef = useRef(null);
  
  // Firebase Auth State
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Controlled task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    subCategory: '',
    estTime: ''
  });

  // --- State Management (Cloud Synced) ---
  const [vision, setVision, vInit] = useFirebaseStorage(user, 'vision', {
    life: 'To live a balanced, purposeful life...',
    annual: 'Build a sustainable foundation for...',
    themes: ['Health', 'Wealth', 'Wisdom'],
    coreValues: 'Integrity, Growth, Compassion'
  });

  const [categories, setCategories, cInit] = useFirebaseStorage(user, 'categories_v2', defaultCategories);
  
  const [goals, setGoals, gInit] = useFirebaseStorage(user, 'goals', []);
  const [goalPriority, setGoalPriority] = useState('High');
  const [weeklyFocus, setWeeklyFocus, wInit] = useFirebaseStorage(user, 'weeklyFocus', { text: '', weekOf: actualTodayStr });
  
  const [tasks, setTasks, tInit] = useFirebaseStorage(user, 'tasks', []);
  const [reflections, setReflections, rInit] = useFirebaseStorage(user, 'reflections', []);

  const allDataInitialized = vInit && cInit && gInit && wInit && tInit && rInit;

  // --- Derived State & Logic ---
  const viewedTasks = useMemo(() => tasks.filter(t => t.date === selectedDate), [tasks, selectedDate]);
  
  const overloadStats = useMemo(() => {
    let totalMins = 0;
    viewedTasks.forEach(t => {
      totalMins += parseInt(t.estTime) || 0;
    });
    return {
      totalMins,
      totalHours: (totalMins / 60).toFixed(1),
      totalTasks: viewedTasks.length,
      isOverloaded: totalMins > 480 || viewedTasks.length > 6
    };
  }, [viewedTasks]);

  // Dynamic Reminders Logic
  const isMorningReviewTime = currentHour === 9 && currentMinute >= 30 && currentHour < 12;
  const isEveningReflectionTime = currentHour >= 22 || (currentHour === 22 && currentMinute >= 30);

  // --- Handlers ---
  const handleAddTask = (e) => {
    e.preventDefault();
    const mainCat = selectedMainCat;
    const subCat = taskForm.subCategory || 'General';

    // Auto-save self-defined subcategories
    if (categories[mainCat] && !categories[mainCat].includes(subCat)) {
      setCategories({
        ...categories,
        [mainCat]: [...categories[mainCat], subCat]
      });
    }

    const newTask = {
      id: Date.now().toString(),
      date: selectedDate,
      title: taskForm.title,
      category: mainCat,
      subCategory: subCat,
      estTime: parseInt(taskForm.estTime),
      status: 'Not Started'
    };
    
    setTasks([...tasks, newTask]);
    setTaskForm({ ...taskForm, title: '', estTime: '' });
  };

  const toggleTaskStatus = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Done' ? 'Not Started' : 'Done';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const saveReflection = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newRef = {
      id: Date.now().toString(),
      date: selectedDate,
      completion: parseInt(formData.get('completion')),
      mood: parseInt(formData.get('mood')),
      overloaded: formData.get('overloaded') === 'on',
      notes: formData.get('notes')
    };
    const updated = reflections.filter(r => r.date !== selectedDate); // replace if exists
    setReflections([...updated, newRef]);

    // Handle Task Recycling (Rollover to next day)
    const nextDayStr = getNextDayStr(selectedDate);
    let recycledCount = 0;
    
    const updatedTasks = tasks.map(t => {
      // If task is from the viewed date, not done, and the user left the recycle checkbox checked
      if (t.date === selectedDate && t.status !== 'Done' && formData.get(`recycle_${t.id}`) === 'on') {
        recycledCount++;
        return { ...t, date: nextDayStr };
      }
      return t;
    });

    if (recycledCount > 0) {
      setTasks(updatedTasks);
      alert(`Reflection saved! Rolled over ${recycledCount} tasks to ${selectedDate === actualTodayStr ? "tomorrow" : "the next day"}.`);
    } else {
      alert('Reflection saved successfully.');
    }
  };

  // --- Sub-components (Render Functions) ---

  const renderVisionView = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center"><Eye className="mr-2 w-5 h-5 text-indigo-400"/> Life Vision</h2>
        <textarea 
          value={vision.life} 
          onChange={(e) => setVision({...vision, life: e.target.value})}
          className="w-full p-4 bg-slate-50/50 rounded-xl border-none focus:ring-2 focus:ring-indigo-200 resize-none h-32 text-slate-700 outline-none"
          placeholder="What is your ultimate life vision?"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center"><Target className="mr-2 w-5 h-5 text-indigo-400"/> 2026 Annual Vision</h2>
          <textarea 
            value={vision.annual} 
            onChange={(e) => setVision({...vision, annual: e.target.value})}
            className="w-full p-4 bg-slate-50/50 rounded-xl border-none focus:ring-2 focus:ring-indigo-200 resize-none h-32 text-slate-700 outline-none"
          />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center"><Settings className="mr-2 w-5 h-5 text-indigo-400"/> Core Logic</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-500">Core Values</label>
              <input type="text" value={vision.coreValues} onChange={(e) => setVision({...vision, coreValues: e.target.value})} className="mt-1 w-full p-3 bg-slate-50/50 rounded-xl border-none focus:ring-2 focus:ring-indigo-200 outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-500">3 Yearly Themes</label>
              <div className="flex gap-2 mt-1">
                {vision.themes.map((theme, idx) => (
                  <input key={idx} type="text" value={theme} onChange={(e) => {
                    const newThemes = [...vision.themes];
                    newThemes[idx] = e.target.value;
                    setVision({...vision, themes: newThemes});
                  }} className="w-1/3 p-3 bg-slate-50/50 rounded-xl border-none focus:ring-2 focus:ring-indigo-200 text-sm outline-none" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGoalsView = () => {
    const addGoal = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      setGoals([...goals, {
        id: Date.now().toString(),
        title: fd.get('title'),
        description: fd.get('description'),
        priority: fd.get('priority'),
        annualTag: fd.get('annualTag')
      }]);
      e.target.reset();
      setGoalPriority('High');
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Add Quarterly Goal</h2>
          <form onSubmit={addGoal} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input required name="title" placeholder="Goal Title" className="w-full p-3 bg-slate-50 text-slate-700 font-medium placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
            
            <CustomSelect 
              name="priority"
              value={goalPriority} 
              onChange={setGoalPriority} 
              options={['High', 'Medium', 'Low']} 
              theme="slate" 
            />
            
            <input name="annualTag" placeholder="Related Annual Theme (e.g. Health)" className="w-full p-3 bg-slate-50 text-slate-700 font-medium placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
            
            <textarea name="description" placeholder="Description & Success Criteria" className="w-full p-3 bg-slate-50 text-slate-700 font-medium placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm md:col-span-2 resize-none h-24" />
            
            <button type="submit" className="md:col-span-2 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-md flex justify-center items-center">
              <Plus className="w-5 h-5 mr-2" /> Create Goal
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Active Quarterly Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(g => (
              <div key={g.id} className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${g.priority === 'High' ? 'bg-amber-400' : g.priority === 'Medium' ? 'bg-blue-400' : 'bg-slate-300'}`}></div>
                <h3 className="font-semibold text-lg text-slate-800 pl-2">{g.title}</h3>
                <p className="text-sm text-slate-500 mt-1 pl-2">{g.description}</p>
                <div className="mt-4 flex gap-2 pl-2">
                  <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md font-medium">Tag: {g.annualTag}</span>
                  <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">{g.priority} Prio</span>
                </div>
              </div>
            ))}
            {goals.length === 0 && <p className="text-slate-400 italic">No quarterly goals set.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderDailyView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Dynamic Reminders */}
      {isMorningReviewTime && selectedDate === actualTodayStr && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start">
          <Sunrise className="w-6 h-6 text-amber-500 mr-3 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Morning Review (9:30 AM)</h3>
            <p className="text-amber-700 text-sm mt-1">Good morning! You have {viewedTasks.length} tasks scheduled today taking roughly {overloadStats.totalHours} hours. Review your top priorities and ensure alignment with your weekly focus.</p>
          </div>
        </div>
      )}

      {/* Weekly Focus Bridge */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-indigo-500 uppercase tracking-wider mb-2 flex items-center">
          <Calendar className="w-4 h-4 mr-2" /> Weekly Focus
        </h3>
        <input 
          value={weeklyFocus.text}
          onChange={e => setWeeklyFocus({...weeklyFocus, text: e.target.value})}
          placeholder="What is the overarching focus for this week?"
          className="w-full text-lg font-medium text-slate-800 bg-transparent border-none focus:ring-0 p-0 placeholder-slate-300 outline-none"
        />
      </div>

      {/* Overload Engine Warning */}
      {overloadStats.isOverloaded && (
        <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl flex items-start animate-pulse">
          <AlertTriangle className="w-6 h-6 text-rose-500 mr-3 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-rose-900">Overload Warning</h3>
            <p className="text-rose-700 text-sm mt-1">
              You may be overloaded today. You have scheduled <strong>{overloadStats.totalHours} hours</strong> ({overloadStats.totalTasks} tasks). Consider deferring some items.
            </p>
          </div>
        </div>
      )}

      {/* Task Creation Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <form onSubmit={handleAddTask} className="flex flex-col gap-4">
          <input 
            required 
            name="title" 
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            placeholder="What needs to be done?" 
            className="w-full p-3 text-lg bg-slate-50 text-slate-800 font-semibold placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CustomSelect 
              value={selectedMainCat}
              onChange={(val) => {
                setSelectedMainCat(val);
                setTaskForm({ ...taskForm, subCategory: '' });
              }}
              options={Object.keys(categories)}
              theme="slate"
            />

            <CustomCombobox 
              value={taskForm.subCategory}
              onChange={(val) => setTaskForm({ ...taskForm, subCategory: val })}
              options={categories[selectedMainCat] || []}
              placeholder="Sub-vertical..."
            />
            
            <input 
              required 
              type="number" 
              name="estTime" 
              value={taskForm.estTime}
              onChange={(e) => setTaskForm({ ...taskForm, estTime: e.target.value })}
              placeholder="Mins (e.g. 30)" 
              className="w-full p-3 bg-slate-50 text-slate-700 font-semibold placeholder-slate-400 rounded-xl border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm text-sm" 
            />
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-md flex justify-center items-center mt-2">
            <Plus className="w-5 h-5 mr-2" /> Add Task
          </button>
        </form>
      </div>

      {/* Task List (Grouped by Colored Main Category columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(categories).map(cat => {
          const catTasks = viewedTasks.filter(t => t.category === cat || (!t.category && cat === 'Household'));
          const theme = categoryTheme[cat] || categoryTheme['Default'];

          return (
            <div key={cat} className={`${theme.bg} rounded-2xl p-4 border ${theme.border} flex flex-col gap-3 min-h-[200px] transition-colors`}>
              <h3 className={`font-bold uppercase text-xs tracking-wider mb-1 flex justify-between items-center ${theme.text}`}>
                {cat}
                <span className={`${theme.badgeBg} px-2 py-0.5 rounded-full`}>{catTasks.length}</span>
              </h3>
              
              {catTasks.length === 0 ? (
                <div className={`text-center py-6 text-sm italic opacity-60 ${theme.text}`}>No tasks</div>
              ) : (
                catTasks.map(t => (
                  <div key={t.id} className={`p-3 bg-white/90 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm transition-all relative group ${t.status === 'Done' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleTaskStatus(t.id)} className={`hover:${theme.text} transition-colors mt-0.5 shrink-0 ${t.status === 'Done' ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {t.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-medium truncate ${t.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</h4>
                        <p className={`text-xs truncate mt-0.5 font-medium ${t.status === 'Done' ? 'text-slate-400' : theme.text}`}>{t.subCategory}</p>
                        <div className="flex gap-2 text-[10px] text-slate-500 mt-2">
                          <span className="flex items-center"><Clock className="w-3 h-3 mr-0.5"/> {t.estTime}m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReflectionView = () => {
    const todayReflection = reflections.find(r => r.date === selectedDate) || {};
    const unfinishedTasks = viewedTasks.filter(t => t.status !== 'Done');
    
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {(isEveningReflectionTime || true) && (
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <Moon className="absolute top-8 right-8 w-32 h-32 text-indigo-400/10" />
            <h2 className="text-2xl font-bold mb-2 relative z-10 text-indigo-100">
              {selectedDate === actualTodayStr ? 'Evening Reflection' : 'Daily Reflection'}
            </h2>
            <p className="text-indigo-200/70 mb-8 relative z-10">
              {selectedDate === actualTodayStr ? 'Review your day, extract insights, and close loops.' : `Reflection for ${new Date(selectedDate + 'T12:00:00').toLocaleDateString()}`}
            </p>
            
            <form onSubmit={saveReflection} className="relative z-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Completion Rate (0-100%)</label>
                  <input required type="number" min="0" max="100" name="completion" defaultValue={todayReflection.completion || 0} className="w-full p-3 bg-white/5 rounded-xl border border-indigo-500/30 focus:ring-2 focus:ring-indigo-400 text-white placeholder-white/30 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-2">Mood Rating (1-10)</label>
                  <input required type="number" min="1" max="10" name="mood" defaultValue={todayReflection.mood || 5} className="w-full p-3 bg-white/5 rounded-xl border border-indigo-500/30 focus:ring-2 focus:ring-indigo-400 text-white outline-none" />
                </div>
              </div>
              
              <div className="flex items-center">
                <input type="checkbox" name="overloaded" id="overloaded" defaultChecked={todayReflection.overloaded || false} className="w-5 h-5 rounded border-indigo-500/30 bg-white/5 text-indigo-500 focus:ring-indigo-500" />
                <label htmlFor="overloaded" className="ml-3 text-sm font-medium text-indigo-200">Did you feel overloaded today?</label>
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-200 mb-2">Notes & Insights</label>
                <textarea name="notes" defaultValue={todayReflection.notes || ''} placeholder="What went well? What could be improved?" className="w-full p-4 bg-white/5 rounded-xl border border-indigo-500/30 focus:ring-2 focus:ring-indigo-400 resize-none h-32 text-white placeholder-white/20 outline-none" />
              </div>

              {/* Unfinished Tasks Rollover Section */}
              {unfinishedTasks.length > 0 && (
                <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-indigo-500/30">
                  <h3 className="text-lg font-semibold text-indigo-100 mb-2">Unfinished Tasks</h3>
                  <p className="text-sm text-indigo-200/70 mb-4">Select tasks to automatically roll over to {selectedDate === actualTodayStr ? "tomorrow's" : "the next day's"} planner:</p>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 hide-scrollbar">
                    {unfinishedTasks.map(t => (
                      <label key={t.id} className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-white/5 rounded-xl transition-colors">
                        <input 
                          type="checkbox" 
                          name={`recycle_${t.id}`} 
                          defaultChecked 
                          className="w-5 h-5 rounded border-indigo-500/30 bg-white/5 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-indigo-100 group-hover:text-white transition-colors truncate font-medium">{t.title}</p>
                          <p className="text-xs text-indigo-300/60 truncate">{t.category} {t.subCategory ? `— ${t.subCategory}` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/20 mt-4 outline-none">
                Save Reflection & Close Day
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  const renderDashboardView = () => {
    const last7Reflections = [...reflections].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
    const avgCompletion = last7Reflections.length > 0 ? Math.round(last7Reflections.reduce((sum, r) => sum + r.completion, 0) / last7Reflections.length) : 0;
    const overloadCount = last7Reflections.filter(r => r.overloaded).length;

    // Weekly Time Allocation for Pie Chart using light saturation hex colors
    const last7DaysDate = new Date();
    last7DaysDate.setDate(last7DaysDate.getDate() - 7);
    const weeklyTasks = tasks.filter(t => new Date(t.date) >= last7DaysDate);
    
    const weeklyTimeByCategory = {};
    Object.keys(categories).forEach(c => weeklyTimeByCategory[c] = 0);
    
    weeklyTasks.forEach(t => {
      const cat = t.category || 'Other';
      if (weeklyTimeByCategory[cat] === undefined) weeklyTimeByCategory[cat] = 0;
      weeklyTimeByCategory[cat] += (parseInt(t.estTime) || 0);
    });
    
    const totalWeeklyTime = Object.values(weeklyTimeByCategory).reduce((a,b)=>a+b, 0) || 1;
    
    let conicString = '';
    let currentPct = 0;
    Object.entries(weeklyTimeByCategory).forEach(([cat, time]) => {
      if (time > 0) {
        const pct = (time / totalWeeklyTime) * 100;
        const color = categoryTheme[cat]?.hex || categoryTheme['Default'].hex;
        conicString += `${color} ${currentPct}% ${currentPct + pct}%, `;
        currentPct += pct;
      }
    });
    conicString = conicString ? conicString.slice(0, -2) : 'transparent 0% 100%';

    const allCategoryTime = {};
    tasks.forEach(t => {
      const key = t.subCategory ? `${t.category} - ${t.subCategory}` : (t.category || 'Uncategorized');
      if (!allCategoryTime[key]) allCategoryTime[key] = 0;
      allCategoryTime[key] += (parseInt(t.estTime) || 0);
    });
    const totalLogTime = Object.values(allCategoryTime).reduce((a,b)=>a+b, 0) || 1; 
    const sortedCategories = Object.entries(allCategoryTime).sort((a,b)=>b[1]-a[1]).slice(0, 5);

    // Mood trend SVG
    const maxPoints = 7;
    const paddedMoods = Array(maxPoints - last7Reflections.length).fill(5).concat(last7Reflections.map(r => r.mood));
    const svgWidth = 300;
    const svgHeight = 60;
    const stepX = svgWidth / (maxPoints - 1);
    const pointsStr = paddedMoods.map((m, i) => `${i * stepX},${svgHeight - ((m / 10) * svgHeight)}`).join(' ');

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <p className="text-sm text-slate-500 mb-1">Weekly Avg Completion</p>
            <p className="text-3xl font-bold text-indigo-500">{avgCompletion}%</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <p className="text-sm text-slate-500 mb-1">Overload Incidents (7d)</p>
            <p className="text-3xl font-bold text-rose-400">{overloadCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center col-span-2">
            <p className="text-sm text-slate-500 mb-2">Mood Trend (Last 7 Days)</p>
            <div className="h-12 w-full flex items-end justify-center">
              <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none">
                <polyline points={pointsStr} fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {paddedMoods.map((m, i) => (
                   <circle key={i} cx={i * stepX} cy={svgHeight - ((m / 10) * svgHeight)} r="4" fill="#6366f1" />
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-1 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 self-start">Weekly Time Focus</h2>
            
            {totalWeeklyTime > 1 ? (
              <>
                <div className="w-40 h-40 rounded-full mb-6 shadow-inner border-[6px] border-slate-50" style={{ background: `conic-gradient(${conicString})` }}></div>
                <div className="w-full space-y-3">
                  {Object.entries(weeklyTimeByCategory).filter(([_, time]) => time > 0).map(([cat, time]) => (
                    <div key={cat} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: categoryTheme[cat]?.hex || categoryTheme['Default'].hex }}></div>
                        <span className="text-slate-600 font-medium">{cat}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{Math.round((time / totalWeeklyTime) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">No tasks this week</div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 md:col-span-2">
             <h2 className="text-lg font-semibold text-slate-800 mb-6">Historical Sub-Vertical Allocation (Top 5)</h2>
             <div className="space-y-5">
               {sortedCategories.length === 0 ? <p className="text-slate-400 text-sm">No tasks logged yet.</p> : 
                sortedCategories.map(([cat, time]) => {
                  const percent = Math.round((time / totalLogTime) * 100);
                  const mainCatStr = cat.split(' - ')[0];
                  const themeColors = categoryTheme[mainCatStr] || categoryTheme['Default'];
                  
                  return (
                    <div key={cat} className="flex items-center text-sm">
                      <span className="w-1/3 truncate text-slate-600 font-medium">{cat}</span>
                      <div className="w-1/2 bg-slate-100 rounded-full h-3 mx-3 overflow-hidden">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: themeColors.hex }}></div>
                      </div>
                      <span className="w-1/6 text-right font-semibold text-slate-700">{percent}%</span>
                    </div>
                  );
               })}
             </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading State
  if (loadingAuth || (user && !allDataInitialized)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">VisionFlow</h1>
        <p className="text-sm text-slate-500">Syncing to cloud...</p>
      </div>
    );
  }

  // --- Layout Rendering ---
  const navItems = [
    { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
    { id: 'vision', icon: Eye, label: 'Vision' },
    { id: 'goals', icon: Target, label: 'Goals' },
    { id: 'daily', icon: CheckCircle2, label: 'Daily' },
    { id: 'reflection', icon: Moon, label: 'Reflection' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 pb-24 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">VisionFlow</h1>
            <p className="text-slate-500 mt-1">A Vision-Driven Planning System</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            {selectedDate !== actualTodayStr && (
              <button 
                onClick={() => setSelectedDate(actualTodayStr)}
                className="text-xs font-bold px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                Back to Today
              </button>
            )}
            
            <div className="relative bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 font-medium text-sm flex items-center w-fit text-slate-600 hover:bg-slate-50 transition-colors group">
              <Calendar className="w-4 h-4 mr-2 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </header>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex flex-wrap pb-2 mb-6 gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Main Content Area */}
        <main className="pb-8">
          {activeTab === 'dashboard' && renderDashboardView()}
          {activeTab === 'vision' && renderVisionView()}
          {activeTab === 'goals' && renderGoalsView()}
          {activeTab === 'daily' && renderDailyView()}
          {activeTab === 'reflection' && renderReflectionView()}
        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-around items-center pb-safe pt-2 px-1 z-50 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.05)]">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 rounded-xl transition-colors min-w-[60px] ${
                isActive 
                  ? 'text-indigo-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`p-1.5 rounded-full mb-1 transition-colors ${isActive ? 'bg-indigo-50' : 'bg-transparent'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 1.5rem); }
      `}} />
    </div>
  );
}
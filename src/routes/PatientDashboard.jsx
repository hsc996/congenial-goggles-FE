import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import MainNav from '../components/LandingPage/MainNav';
import CalendarGrid from '../components/Dashboard/CaregiverCal';
import { ChevronLeft, ChevronRight, ArrowLeft, FileText, Tag } from 'lucide-react';
import DailySidebar from '../components/Dashboard/DailySidebar';
import PatientHeader from '../components/Dashboard/PatientHeader';
import PatientSidebar from '../components/Dashboard/PatientSidebar';
import { patientAPI } from '../api/patient';
import { useNotificationService } from '../components/Notifications/notificationService';
import { useUserAuthContext } from '../contexts/AuthContext/AuthContext';

// ─── Shape adapters ──────────────────────────────────────────────────────────

function toHeaderShape(patient) {
    if (!patient) return null;
    return {
        _id: patient._id,
        name: [patient.firstName, patient.lastName].filter(Boolean).join(' ') || '—',
        profileImg: patient.profileImg ?? null,
        dob: patient.dateOfBirth
            ? new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
              })
            : '—',
        allergies: patient.allergies?.join(', ') || '—',
        carers: '—',
    };
}

function toMedications(patient) {
    return (patient?.medicationSchedule ?? [])
        .filter((m) => m.isActive !== false)
        .flatMap((m, i) =>
            (m.scheduledTimes?.length ? m.scheduledTimes : ['—']).map((time, j) => ({
                id: `${i}-${j}`,
                name: m.name ?? '',
                dosage: m.dosage ?? '',
                route: m.route ?? '',
                time,
                frequency: m.frequency ?? '',
            }))
        )
        .sort((a, b) => {
            if (a.time === '—') return 1;
            if (b.time === '—') return -1;
            return a.time.localeCompare(b.time);
        });
}

function toAdls(patient) {
    return (patient?.careTaskSchedule ?? []).map((t, i) => ({
        id: i,
        task: t.task,
        time: t.frequency ?? '',
        completed: false,
        addedBy: t.category ?? '',
    }));
}

const formatDateKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const toISODate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// ─── Handover note detail ─────────────────────────────────────────────────────

function HandoverNoteDetail({ note, onBack }) {
    const time = new Date(note.submittedAt).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const date = new Date(note.submittedAt).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    return (
        <div className="flex flex-col h-full">
            <div className="mb-6 flex items-center gap-3">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Calendar
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5">
                <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-brand-50 p-2.5 shrink-0">
                        <FileText className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{note.title}</h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {note.caregiver} · {date} at {time}
                        </p>
                    </div>
                </div>

                <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {note.content}
                </p>

                {note.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
                            >
                                <Tag className="h-3 w-3" />
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

function PatientDashboard() {
    const { sendErrorNotification } = useNotificationService();
    const { currentUser } = useUserAuthContext();

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [currentDate, setCurrentDate]         = useState(new Date());
    const [selectedDate, setSelectedDate]       = useState(null);
    const [dailySidebarOpen, setDailySidebarOpen] = useState(false);
    const [taskStates, setTaskStates]           = useState({});
    const [shifts, setShifts]                   = useState({});
    const [shiftsLoading, setShiftsLoading]     = useState(false);
    const [handoverNotes, setHandoverNotes]       = useState([]);
    const [selectedNote, setSelectedNote]         = useState(null);
    const [medicationRecords, setMedicationRecords] = useState({});

    // Shared promise ref: ensures only one HTTP request is made per patient+month
    // even when StrictMode or rapid re-renders cause the effect to fire multiple times.
    const shiftsFetchRef = useRef(null); // { key: string, promise: Promise }

    // Fetch shifts per month
    useEffect(() => {
        if (!selectedPatient?._id) return;

        const key = `${selectedPatient._id}|${currentDate.getFullYear()}-${currentDate.getMonth()}`;
        let cancelled = false;

        if (!shiftsFetchRef.current || shiftsFetchRef.current.key !== key) {
            setShiftsLoading(true);
            shiftsFetchRef.current = {
                key,
                promise: patientAPI.getPatientShifts(
                    selectedPatient._id,
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                ),
            };
        }

        shiftsFetchRef.current.promise
            .then((res) => { if (!cancelled) setShifts(res.data.data ?? {}); })
            .catch(() => {
                if (!cancelled) {
                    sendErrorNotification('Failed to load shifts.');
                    shiftsFetchRef.current = null;
                }
            })
            .finally(() => { if (!cancelled) setShiftsLoading(false); });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatient?._id, currentDate.getFullYear(), currentDate.getMonth()]);

    // Fetch handover notes when selected date or patient changes
    useEffect(() => {
        if (!selectedPatient?._id || !selectedDate) return;

        let cancelled = false;
        async function fetchNotes() {
            try {
                const res = await patientAPI.getHandoverNotes(
                    selectedPatient._id,
                    toISODate(selectedDate),
                );
                if (!cancelled) setHandoverNotes(res.data.data ?? []);
            } catch {
                if (!cancelled) setHandoverNotes([]);
            }
        }
        fetchNotes();
        return () => { cancelled = true; };
    }, [selectedPatient?._id, selectedDate]);

    // Fetch medication administration records when selected date or patient changes
    useEffect(() => {
        if (!selectedPatient?._id || !selectedDate) {
            setMedicationRecords({});
            return;
        }

        let cancelled = false;
        const meds = toMedications(selectedPatient);

        patientAPI.getMedicationAdministrations(selectedPatient._id, toISODate(selectedDate))
            .then((res) => {
                if (cancelled) return;
                const adminRecords = res.data.data ?? [];
                const built = {};
                for (const med of meds) {
                    const match = adminRecords.find(
                        (r) => r.medicationName === med.name && r.scheduledTime === med.time
                    );
                    if (match) {
                        const u = match.administeredBy;
                        built[med.id] = {
                            recordId: match._id,
                            givenBy: u ? `${u.firstName} ${u.lastName}`.trim() : 'Unknown',
                            givenAt: new Date(match.actualAdministrationTime),
                        };
                    }
                }
                setMedicationRecords(built);
            })
            .catch(() => { if (!cancelled) setMedicationRecords({}); });

        return () => { cancelled = true; };
    }, [selectedPatient?._id, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const headerPatient = toHeaderShape(selectedPatient);
    const medications   = toMedications(selectedPatient);
    const adls          = toAdls(selectedPatient);

    const formatDate = (date) =>
        date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const getPreviousMonth = () =>
        setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));

    const getNextMonth = () =>
        setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));

    const handleDateClick = (day) => {
        setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        setSelectedNote(null);
        setDailySidebarOpen(true);
    };

    const hasShifts = (day) =>
        shifts[formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)] ?? [];

    const isToday = (day) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === currentDate.getMonth() &&
            today.getFullYear() === currentDate.getFullYear()
        );
    };

    const getShiftsForDate = (date) => {
        if (!date) return [];
        return shifts[formatDateKey(date.getFullYear(), date.getMonth(), date.getDate())] ?? [];
    };

    const toggleTask = (type, id) => {
        const key = `${type}-${id}`;
        setTaskStates((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleMedicationValidated = (medId, record) => {
        setMedicationRecords((prev) => ({ ...prev, [medId]: record }));
    };

    const handleMedicationUnvalidated = (medId) => {
        setMedicationRecords((prev) => {
            const next = { ...prev };
            delete next[medId];
            return next;
        });
    };

    const handlePatientSelect = (patient) => {
        setSelectedPatient(patient);
        setShifts({});
        setHandoverNotes([]);
        setMedicationRecords({});
        setSelectedNote(null);
        setDailySidebarOpen(false);
        setSelectedDate(null);
        setTaskStates({});
    };

    return (
        <>
            <MainNav />

            <div className="flex min-h-screen w-full pt-16">
                <PatientSidebar onSelect={handlePatientSelect} />

                <main className="flex flex-1 flex-col min-w-0">
                    {headerPatient && <PatientHeader patient={headerPatient} rawPatient={selectedPatient} />}

                    <div className="flex flex-1 gap-6 bg-[#FDFAF4] py-5 pl-5 pr-8">
                        <div className="flex-1 min-w-0 rounded-xl bg-white p-5 shadow-sm">
                            {selectedNote ? (
                                <HandoverNoteDetail
                                    note={selectedNote}
                                    onBack={() => setSelectedNote(null)}
                                />
                            ) : (
                                <>
                                    <div className="mb-6 flex items-center justify-between">
                                        <span className="text-lg font-medium text-gray-700">
                                            {formatDate(currentDate)}
                                        </span>
                                        <div className="flex space-x-2">
                                            <motion.button
                                                onClick={getPreviousMonth}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="rounded-lg p-2 transition hover:bg-gray-100"
                                            >
                                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                                            </motion.button>
                                            <motion.button
                                                onClick={getNextMonth}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="rounded-lg p-2 transition hover:bg-gray-100"
                                            >
                                                <ChevronRight className="h-5 w-5 text-gray-600" />
                                            </motion.button>
                                        </div>
                                    </div>

                                    {shiftsLoading ? (
                                        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                                            Loading schedule…
                                        </div>
                                    ) : (
                                        <CalendarGrid
                                            currentDate={currentDate}
                                            onDateClick={handleDateClick}
                                            hasShifts={hasShifts}
                                            isToday={isToday}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        <AnimatePresence>
                        {dailySidebarOpen && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 384, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                style={{ flexShrink: 0, overflow: 'hidden' }}
                            >
                                <DailySidebar
                                    selectedDate={selectedDate}
                                    onClose={() => {
                                        setDailySidebarOpen(false);
                                        setSelectedNote(null);
                                    }}
                                    shifts={getShiftsForDate(selectedDate)}
                                    medications={medications}
                                    adls={adls}
                                    taskStates={taskStates}
                                    onToggleTask={toggleTask}
                                    handoverNotes={handoverNotes}
                                    onNoteClick={setSelectedNote}
                                    patientId={selectedPatient?._id}
                                    currentUser={currentUser}
                                    medicationRecords={medicationRecords}
                                    onMedicationValidated={handleMedicationValidated}
                                    onMedicationUnvalidated={handleMedicationUnvalidated}
                                />
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </>
    );
}

export default PatientDashboard;

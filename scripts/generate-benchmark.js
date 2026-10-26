import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "benchmark-labeled.json");

// Define 160 synthetic benchmark complaints with exact ground-truth labels
// Departments: Hostel, Mess/Food, Academics, IT/Network, Transport, Security, Maintenance/Infrastructure, Library, Health, Administration
// Urgencies: critical, high, medium, low
// Rule: Every non-duplicate has its own unique true_case_id. Duplicate clusters share a true_case_id.

const benchmarkData = [
  // =========================================================================
  // CLUSTER 1: Hostel B Water Supply Outage (10 duplicates) -> CASE-WATER-HOSTEL-B
  // =========================================================================
  {
    id: "BM-001",
    text: "There has been no water in Hostel B since last night. Please fix the supply.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-002",
    text: "Hostel B water taps are dry again, we have no water since morning.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-003",
    text: "B hostel lo water ravatledu, please solve cheyandi.",
    language: "te",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-004",
    text: "No water supply in B block hostel bathrooms from yesterday.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-005",
    text: "हमारे हॉस्टल B में कल से पानी नहीं आ रहा है।",
    language: "hi",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-006",
    text: "Hostel B water problem continues, drinking water and taps are unavailable.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-007",
    text: "B hostel lo nillu levu since yesterday night.",
    language: "mixed",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-008",
    text: "There is no running water in Hostel B rooms and washrooms.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-009",
    text: "Hostel B water supply stopped again. Kindly repair it.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },
  {
    id: "BM-010",
    text: "Hostel B mein paani nahi aa raha, please help.",
    language: "hi",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-WATER-HOSTEL-B"
  },

  // =========================================================================
  // CLUSTER 2: Mess Cold/Spoiled Food (5 duplicates) -> CASE-MESS-COLD
  // =========================================================================
  {
    id: "BM-011",
    text: "Mess lunch was served cold for the third day. Please check the kitchen.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-COLD"
  },
  {
    id: "BM-012",
    text: "आज मेस में खाना ठंडा था और दाल में बदबू थी।",
    language: "hi",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-COLD"
  },
  {
    id: "BM-013",
    text: "Mess lo food cold ga undi, daily same problem.",
    language: "mixed",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-COLD"
  },
  {
    id: "BM-014",
    text: "The mess food is cold and the serving counter is not keeping it warm.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-COLD"
  },
  {
    id: "BM-015",
    text: "Food served at lunch in the central mess was completely cold and stale.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-COLD"
  },

  // =========================================================================
  // CLUSTER 3: Library Wi-Fi outage (4 duplicates) -> CASE-WIFI-LIB
  // =========================================================================
  {
    id: "BM-016",
    text: "Campus Wi-Fi has been down in the library since 9 AM.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-WIFI-LIB"
  },
  {
    id: "BM-017",
    text: "Library internet is not working since morning, please restore it.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-WIFI-LIB"
  },
  {
    id: "BM-018",
    text: "లైబ్రరీలో వైఫై పనిచేయడం లేదు, ఉదయం నుంచి నెట్ లేదు.",
    language: "te",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-WIFI-LIB"
  },
  {
    id: "BM-019",
    text: "No internet access on the library Wi-Fi network for the past three hours.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-WIFI-LIB"
  },

  // =========================================================================
  // CLUSTER 4: Morning East Gate Bus delay (4 duplicates) -> CASE-BUS-EAST
  // =========================================================================
  {
    id: "BM-020",
    text: "The 7:30 AM campus bus did not arrive at the east gate today.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-BUS-EAST"
  },
  {
    id: "BM-021",
    text: "East gate morning shuttle is late again and students missed class.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-BUS-EAST"
  },
  {
    id: "BM-022",
    text: "बस आज सुबह ईस्ट गेट पर नहीं आई, हम क्लास के लिए लेट हो गए।",
    language: "hi",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-BUS-EAST"
  },
  {
    id: "BM-023",
    text: "7:30 East gate bus missing this morning without prior notice.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-BUS-EAST"
  },

  // =========================================================================
  // CLUSTER 5: South Gate Pothole (3 duplicates) -> CASE-ROAD-POTHOLE
  // =========================================================================
  {
    id: "BM-024",
    text: "There is a pothole on the road outside the south gate.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-ROAD-POTHOLE"
  },
  {
    id: "BM-025",
    text: "South gate road pothole is getting larger and hard to avoid.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-ROAD-POTHOLE"
  },
  {
    id: "BM-026",
    text: "Deep pothole right before the south gate entrance needs urgent bitumen repair.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-ROAD-POTHOLE"
  },

  // =========================================================================
  // CLUSTER 6: Fee Portal Blank Screen (3 duplicates) -> CASE-PORTAL-FEE
  // =========================================================================
  {
    id: "BM-027",
    text: "The fee payment page shows a blank screen after I click submit.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-PORTAL-FEE"
  },
  {
    id: "BM-028",
    text: "Online fee portal goes blank on the final confirmation step.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-PORTAL-FEE"
  },
  {
    id: "BM-029",
    text: "Fee submission webpage crashes with a white blank screen.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-PORTAL-FEE"
  },

  // =========================================================================
  // CLUSTER 7: Streetlight outside Hostel Gate Dark Path (3 duplicates) -> CASE-STREETLIGHT-GATE
  // =========================================================================
  {
    id: "BM-030",
    text: "The streetlight outside the hostel gate is off; the path is dark but no one has reported an incident.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-STREETLIGHT-GATE"
  },
  {
    id: "BM-031",
    text: "रात में हॉस्टल के बाहर स्ट्रीट लाइट बंद है और रास्ता अंधेरा है।",
    language: "hi",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-STREETLIGHT-GATE"
  },
  {
    id: "BM-032",
    text: "Streetlight not working near the main hostel gate, pathway is pitched dark at night.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-STREETLIGHT-GATE"
  },

  // =========================================================================
  // CLUSTER 8: Database Systems Internal Marks Missing (3 duplicates) -> CASE-MARKS-DBS
  // =========================================================================
  {
    id: "BM-033",
    text: "My internal exam marks are missing from the student portal for Database Systems.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-MARKS-DBS"
  },
  {
    id: "BM-034",
    text: "Internal marks not updated for Database Systems, can the faculty check?",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-MARKS-DBS"
  },
  {
    id: "BM-035",
    text: "Database Systems midterm internal marks still showing as not uploaded for our section.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-MARKS-DBS"
  },

  // =========================================================================
  // CLUSTER 9: Leaking tap in sports washroom (2 duplicates) -> CASE-LEAK-SPORTS
  // =========================================================================
  {
    id: "BM-036",
    text: "The sports ground washroom has a leaking tap.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-LEAK-SPORTS"
  },
  {
    id: "BM-037",
    text: "Water is continuously dripping from the tap in the sports complex restroom.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-LEAK-SPORTS"
  },

  // =========================================================================
  // CLUSTER 10: Room 204 Fan Wobble (2 duplicates) -> CASE-FAN-204
  // =========================================================================
  {
    id: "BM-038",
    text: "The ceiling fan in room 204 makes a loud noise and wobbles.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-FAN-204"
  },
  {
    id: "BM-039",
    text: "Room 204 ceiling fan shaking dangerously and making grinding noise.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-FAN-204"
  },

  // =========================================================================
  // CRITICAL / SAFETY INDEPENDENT CASES (Unique true_case_id for each)
  // =========================================================================
  {
    id: "BM-040",
    text: "There is smoke and a burning smell near the electrical panel in Block A. Please send help now.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-SMOKE-BLOCK-A"
  },
  {
    id: "BM-041",
    text: "Short circuit sparks near the third floor corridor socket.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-SPARKS-CORRIDOR"
  },
  {
    id: "BM-042",
    text: "A student got an electric shock from a damaged wire near the lab.",
    language: "en",
    true_department: "Health",
    true_urgency: "critical",
    true_case_id: "CASE-SHOCK-LAB"
  },
  {
    id: "BM-043",
    text: "There is a gas leak smell near the hostel kitchen. This feels unsafe.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "critical",
    true_case_id: "CASE-GAS-KITCHEN"
  },
  {
    id: "BM-044",
    text: "Someone is threatening and harassing students near the bus stop.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-THREAT-BUS-STOP"
  },
  {
    id: "BM-045",
    text: "Lift stuck with two people inside at the academic building.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-LIFT-STUCK"
  },
  {
    id: "BM-046",
    text: "Please send an ambulance, a student is injured after falling near the court.",
    language: "en",
    true_department: "Health",
    true_urgency: "critical",
    true_case_id: "CASE-AMBULANCE-COURT"
  },
  {
    id: "BM-047",
    text: "A first-year student reported ragging in the west hostel corridor.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-RAGGING-WEST"
  },
  {
    id: "BM-048",
    text: "హాస్టల్‌లో విద్యుత్ ప్యానెల్ వద్ద పెద్ద ఎత్తున మంటలు వస్తున్నాయి.",
    language: "te",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-FIRE-PANEL-TE"
  },
  {
    id: "BM-049",
    text: "प्रयोगशाला में रासायनिक रिसाव (chemical spill) हुआ है और सांस लेने में जलन हो रही है।",
    language: "hi",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-CHEMICAL-LAB-HI"
  },
  {
    id: "BM-050",
    text: "Severe bleeding from deep glass cut in biochemistry lab, immediate medical attention needed.",
    language: "en",
    true_department: "Health",
    true_urgency: "critical",
    true_case_id: "CASE-BLEEDING-BIO"
  },
  {
    id: "BM-051",
    text: "Suspicious intruder climbing the boundary wall behind girls hostel block.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-INTRUDER-GIRLS"
  },
  {
    id: "BM-052",
    text: "Staircase handrail is completely detached at the 4th floor; someone could fall down the central shaft.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-HANDRAIL-DETACHED"
  },

  // =========================================================================
  // STANDARD INDEPENDENT CASES (Unique true_case_id for each)
  // =========================================================================
  // Mess / Food
  {
    id: "BM-053",
    text: "The vegetarian counter has no labels, I received food I could not identify.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-VEG-LABEL"
  },
  {
    id: "BM-054",
    text: "There are no clean plates at the mess dinner counter.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-NO-PLATES"
  },
  {
    id: "BM-055",
    text: "Mess breakfast menu was not posted this week.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "low",
    true_case_id: "CASE-MESS-MENU-POST"
  },
  {
    id: "BM-056",
    text: "Mess drinking water cooler is not cooling; the water is warm.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "low",
    true_case_id: "CASE-MESS-COOLER-WARM"
  },
  {
    id: "BM-057",
    text: "Insects found floating in the sambar container during dinner service.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "high",
    true_case_id: "CASE-MESS-INSECT"
  },

  // Academics
  {
    id: "BM-058",
    text: "मेरी उपस्थिति गलत दर्ज हुई है, कृपया सुधारें।",
    language: "hi",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-ATTENDANCE-HI"
  },
  {
    id: "BM-059",
    text: "The classroom projector is broken and the lecture cannot proceed.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-PROJECTOR-BROKEN"
  },
  {
    id: "BM-060",
    text: "Can the department share the timetable for next semester?",
    language: "en",
    true_department: "Academics",
    true_urgency: "low",
    true_case_id: "CASE-TIMETABLE-REQUEST"
  },
  {
    id: "BM-061",
    text: "The exam hall seating plan has a duplicate seat number for two students.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-EXAM-SEATING-DUPE"
  },
  {
    id: "BM-062",
    text: "Grade sheet has a calculation error in the GPA calculation for semester 4.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-GPA-ERROR"
  },
  {
    id: "BM-063",
    text: "Professors office hours clash with our mandatory core lab course.",
    language: "en",
    true_department: "Academics",
    true_urgency: "low",
    true_case_id: "CASE-OFFICE-HOURS-CLASH"
  },

  // IT / Network
  {
    id: "BM-064",
    text: "The student portal rejects my login even though the password is correct.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-PORTAL-LOGIN-REJECT"
  },
  {
    id: "BM-065",
    text: "Cannot log into the student portal, it says service unavailable.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-PORTAL-SERVICE-UNAVAIL"
  },
  {
    id: "BM-066",
    text: "The online course registration page crashes after choosing electives.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-COURSE-REG-CRASH"
  },
  {
    id: "BM-067",
    text: "Auditorium microphone keeps cutting out during events.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "low",
    true_case_id: "CASE-AUDITORIUM-MIC"
  },
  {
    id: "BM-068",
    text: "Campus email server is bouncing incoming emails from external domains.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "high",
    true_case_id: "CASE-EMAIL-BOUNCING"
  },
  {
    id: "BM-069",
    text: "Lab workstation 14 operating system will not boot past BIOS error.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "low",
    true_case_id: "CASE-LAB-PC14-BOOT"
  },

  // Transport
  {
    id: "BM-070",
    text: "The bus AC is not working and the windows are stuck closed.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-BUS-AC-STUCK"
  },
  {
    id: "BM-071",
    text: "My bus pass renewal is pending even though I submitted the form.",
    language: "en",
    true_department: "Transport",
    true_urgency: "low",
    true_case_id: "CASE-BUS-PASS-RENEW"
  },
  {
    id: "BM-072",
    text: "The campus shuttle route map on the website is outdated.",
    language: "en",
    true_department: "Transport",
    true_urgency: "low",
    true_case_id: "CASE-SHUTTLE-MAP-OLD"
  },
  {
    id: "BM-073",
    text: "Bus driver was driving recklessly and running red lights near university junction.",
    language: "en",
    true_department: "Transport",
    true_urgency: "high",
    true_case_id: "CASE-BUS-RECKLESS"
  },
  {
    id: "BM-074",
    text: "Weekend town shuttle frequency is inadequate; over 80 students waiting at terminal.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-SHUTTLE-WEEKEND-FREQ"
  },

  // Library
  {
    id: "BM-075",
    text: "The library book return kiosk is frozen and will not accept returns.",
    language: "en",
    true_department: "Library",
    true_urgency: "medium",
    true_case_id: "CASE-LIB-KIOSK-FROZEN"
  },
  {
    id: "BM-076",
    text: "Need a two-day extension for returning a library book due to illness.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-RETURN-EXT"
  },
  {
    id: "BM-077",
    text: "Please add more copies of the Data Structures textbook to the library.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-MORE-COPIES"
  },
  {
    id: "BM-078",
    text: "The library is too noisy in the quiet study zone.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-NOISE-STUDY"
  },
  {
    id: "BM-079",
    text: "Can the library extend its weekend opening hours during exams?",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-EXAM-HOURS"
  },
  {
    id: "BM-080",
    text: "Reference section RFID sensor gate keeps beeping falsely when anyone exits.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-RFID-BEEP"
  },

  // Health
  {
    id: "BM-081",
    text: "Need to know when the next campus health clinic is open.",
    language: "en",
    true_department: "Health",
    true_urgency: "low",
    true_case_id: "CASE-HEALTH-CLINIC-TIMING"
  },
  {
    id: "BM-082",
    text: "I have fever and need to know the campus clinic timings.",
    language: "en",
    true_department: "Health",
    true_urgency: "medium",
    true_case_id: "CASE-HEALTH-FEVER-TIMING"
  },
  {
    id: "BM-083",
    text: "The campus medical room has run out of basic first-aid supplies.",
    language: "en",
    true_department: "Health",
    true_urgency: "medium",
    true_case_id: "CASE-HEALTH-SUPPLIES-OUT"
  },
  {
    id: "BM-084",
    text: "A student feels dizzy after sports practice; please check the clinic availability.",
    language: "en",
    true_department: "Health",
    true_urgency: "medium",
    true_case_id: "CASE-HEALTH-DIZZY-SPORTS"
  },
  {
    id: "BM-085",
    text: "Hostel resident has high fever 103F and continuous vomiting, requires immediate physician visit.",
    language: "en",
    true_department: "Health",
    true_urgency: "high",
    true_case_id: "CASE-HEALTH-HIGH-FEVER-VOMIT"
  },

  // Administration
  {
    id: "BM-086",
    text: "My scholarship status is still pending, who can check it?",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-SCHOLARSHIP"
  },
  {
    id: "BM-087",
    text: "Please correct the spelling of my name in the fee receipt.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-SPELLING-RECEIPT"
  },
  {
    id: "BM-088",
    text: "I lost my campus ID card and need the replacement process.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-LOST-ID"
  },
  {
    id: "BM-089",
    text: "Please clarify the process to request an official bonafide certificate.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-BONAFIDE-CERT"
  },
  {
    id: "BM-090",
    text: "Education verification agency request has not been processed for over three weeks.",
    language: "en",
    true_department: "Administration",
    true_urgency: "medium",
    true_case_id: "CASE-ADMIN-EDU-VERIFICATION"
  },

  // Security
  {
    id: "BM-091",
    text: "Please fix the broken lock on the lab storage room.",
    language: "en",
    true_department: "Security",
    true_urgency: "medium",
    true_case_id: "CASE-SEC-STORAGE-LOCK"
  },
  {
    id: "BM-092",
    text: "A security guard was rude when I asked for directions.",
    language: "en",
    true_department: "Security",
    true_urgency: "low",
    true_case_id: "CASE-SEC-GUARD-RUDE"
  },
  {
    id: "BM-093",
    text: "Bicycle stolen from the hostel bicycle rack between 2 PM and 5 PM.",
    language: "en",
    true_department: "Security",
    true_urgency: "medium",
    true_case_id: "CASE-SEC-BIKE-STOLEN"
  },
  {
    id: "BM-094",
    text: "CCTV camera at the north entry point appears offline or tilted downwards.",
    language: "en",
    true_department: "Security",
    true_urgency: "medium",
    true_case_id: "CASE-SEC-CCTV-OFFLINE"
  },

  // Hostel & Maintenance
  {
    id: "BM-095",
    text: "Water is leaking from the ceiling in the second-floor corridor.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-MAINT-CEILING-LEAK"
  },
  {
    id: "BM-096",
    text: "The hostel laundry machines have been out of order for two days.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-LAUNDRY-DOWN"
  },
  {
    id: "BM-097",
    text: "A broken chair in lecture hall 2 needs replacement.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-MAINT-CHAIR-LH2"
  },
  {
    id: "BM-098",
    text: "The classroom AC is too cold and the temperature should be adjusted.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-MAINT-AC-TOO-COLD"
  },
  {
    id: "BM-099",
    text: "The drinking water purifier near the sports ground tastes strange.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-MAINT-PURIFIER-TASTE"
  },
  {
    id: "BM-100",
    text: "There is no soap in the hostel washroom dispensers.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-NO-SOAP"
  },
  {
    id: "BM-101",
    text: "Please repair the leaking tap in the girls hostel ground-floor washroom.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-TAP-GIRLS"
  },
  {
    id: "BM-102",
    text: "The stairwell handrail is loose and could cause someone to fall.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-MAINT-HANDRAIL-LOOSE"
  },
  {
    id: "BM-103",
    text: "Hostel D has no water for 30 minutes due to a planned maintenance check.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-D-MAINT-WATER"
  },
  {
    id: "BM-104",
    text: "Broken window pane in room 114 rattles violently during wind.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-WINDOW-114"
  },
  {
    id: "BM-105",
    text: "Solar water heater on Hostel A roof is leaking scalding hot water down the wall.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-MAINT-SOLAR-HEATER-LEAK"
  },
  {
    id: "BM-106",
    text: "Termites discovered inside the wooden study desks in hostel block E.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-TERMITES-E"
  },
  {
    id: "BM-107",
    text: "Room key got jammed in the lock of hostel room 318, cannot open the door.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-KEY-JAMMED-318"
  },
  {
    id: "BM-108",
    text: "Geyser in hostel washroom trip-switches the circuit whenever turned on.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-MAINT-GEYSER-TRIP"
  },
  {
    id: "BM-109",
    text: "Drainage in the common shower area is completely clogged with standing soapy water.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-SHOWER-CLOG"
  },
  {
    id: "BM-110",
    text: "Pigeon netting has torn on balcony 3B, birds nesting inside.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-PIGEON-NET"
  },

  // Additional realistic diverse complaints across departments
  {
    id: "BM-111",
    text: "Need official transcript envelope stamped by registrar for overseas graduate application.",
    language: "en",
    true_department: "Administration",
    true_urgency: "medium",
    true_case_id: "CASE-ADMIN-TRANSCRIPT-STAMP"
  },
  {
    id: "BM-112",
    text: "Campus gym treadmill number 2 belt slips unexpectedly while running.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-MAINT-GYM-TREADMILL"
  },
  {
    id: "BM-113",
    text: "Can someone spray mosquito repellent in the hostel corridors? Mosquitoes are unbearable.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-MOSQUITO-SPRAY"
  },
  {
    id: "BM-114",
    text: "The student identity portal photo was uploaded upside down and needs correction.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-ID-PHOTO-ROTATED"
  },
  {
    id: "BM-115",
    text: "Basketball court floodlight bulb has burnt out.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-MAINT-BBALL-FLOODLIGHT"
  },
  {
    id: "BM-116",
    text: "Can we get sanitary napkin vending machines restocked in Academic Block 2 washrooms?",
    language: "en",
    true_department: "Health",
    true_urgency: "medium",
    true_case_id: "CASE-HEALTH-VENDING-RESTOCK"
  },
  {
    id: "BM-117",
    text: "Lost silver wrist watch in Chemistry Lecture Hall 1 after morning class.",
    language: "en",
    true_department: "Security",
    true_urgency: "low",
    true_case_id: "CASE-SEC-LOST-WATCH"
  },
  {
    id: "BM-118",
    text: "Digital signboards across campus showing wrong date and time.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "low",
    true_case_id: "CASE-IT-SIGNBOARD-CLOCK"
  },
  {
    id: "BM-119",
    text: "Mess night canteen overcharging 10 rupees above the MRP printed on packaged snacks.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "low",
    true_case_id: "CASE-MESS-OVERCHARGE-MRP"
  },
  {
    id: "BM-120",
    text: "Faculty adviser has not approved internship NOC letter for 10 days.",
    language: "en",
    true_department: "Academics",
    true_urgency: "medium",
    true_case_id: "CASE-ACAD-INTERN-NOC"
  },
  {
    id: "BM-121",
    text: "Badminton court wooden floor has warped boards creating trip hazard.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "medium",
    true_case_id: "CASE-MAINT-BADMINTON-FLOOR"
  },
  {
    id: "BM-122",
    text: "Wheelchair ramp at library main entrance has a broken handrail and steep crack.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-MAINT-RAMP-ACCESSIBILITY"
  },
  {
    id: "BM-123",
    text: "Campus ambulance driver phone number listed on student intranet gives 'out of service'.",
    language: "en",
    true_department: "Health",
    true_urgency: "high",
    true_case_id: "CASE-HEALTH-AMBULANCE-NUMBER"
  },
  {
    id: "BM-124",
    text: "Mess tea in evening was sour, possibly spoiled milk was used.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-SPOILED-TEA"
  },
  {
    id: "BM-125",
    text: "Guest lecturer microphone feedback producing deafening screeching noise in audi 1.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "low",
    true_case_id: "CASE-IT-MIC-SCREECH"
  },
  {
    id: "BM-126",
    text: "Hostel visitor parking area has no lighting, students felt unsafe walking back.",
    language: "en",
    true_department: "Security",
    true_urgency: "medium",
    true_case_id: "CASE-SEC-PARKING-DARK"
  },
  {
    id: "BM-127",
    text: "Hostel room 502 window latch fallen off, cannot lock window against rain.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HOSTEL-WINDOW-502"
  },
  {
    id: "BM-128",
    text: "Need duplicate grade card because original was damaged in transit.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-ADMIN-DUPE-GRADECARD"
  },
  {
    id: "BM-129",
    text: "Physics lab balance calibration weight set has two missing brass weights.",
    language: "en",
    true_department: "Academics",
    true_urgency: "low",
    true_case_id: "CASE-ACAD-PHYSICS-WEIGHTS"
  },
  {
    id: "BM-130",
    text: "Student health insurance card rejected at empaneled hospital reception.",
    language: "en",
    true_department: "Administration",
    true_urgency: "high",
    true_case_id: "CASE-ADMIN-INSURANCE-REJECT"
  },
  {
    id: "BM-131",
    text: "Hostel drinking water dispenser filter replacement overdue by 4 months according to service tag.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HOSTEL-FILTER-TAG-OVERDUE"
  },
  {
    id: "BM-132",
    text: "Campus convenience store selling expired yogurt containers.",
    language: "en",
    true_department: "Mess/Food",
    true_urgency: "medium",
    true_case_id: "CASE-MESS-EXPIRED-YOGURT"
  },
  {
    id: "BM-133",
    text: "Library catalog software shows 3 copies available but none found on the shelf.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-LIB-MISSING-SHELF"
  },
  {
    id: "BM-134",
    text: "Night security guard at gate 3 was asleep when campus shuttle arrived at 11 PM.",
    language: "en",
    true_department: "Security",
    true_urgency: "medium",
    true_case_id: "CASE-SEC-GUARD-ASLEEP"
  },
  {
    id: "BM-135",
    text: "Campus ATM machine debited account but did not dispense cash.",
    language: "en",
    true_department: "Administration",
    true_urgency: "medium",
    true_case_id: "CASE-ADMIN-ATM-CASH"
  },

  // =========================================================================
  // THE 25 HARDEST TEST CASES (Multi-dept ambiguity, near-dupes, regional/code-mixed, slang/negation)
  // Indices BM-136 to BM-160 (all have unique true_case_id)
  // =========================================================================
  {
    id: "BM-136",
    text: "Hostel C has very low water pressure in the third floor taps.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-WATER-HOSTEL-C-LOWPRESSURE"
  },
  {
    id: "BM-137",
    text: "Hostel C room 12 fan is broken, not the same as the Hostel B water issue.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-FAN-HOSTEL-C-ROOM12"
  },
  {
    id: "BM-138",
    text: "The hostel Wi-Fi signal is weak only in room 412.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "low",
    true_case_id: "CASE-WIFI-ROOM412-WEAK"
  },
  {
    id: "BM-139",
    text: "Water cooler in the central library is leaking water directly next to the open server power strip.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-HARD-LEAK-POWERSTRIP-LIB"
  },
  {
    id: "BM-140",
    text: "Delivery person had a heated argument and physical scuffle with the hostel main gate guard.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-HARD-SCUFFLE-GUARD"
  },
  {
    id: "BM-141",
    text: "Server room air conditioner failed and high-performance computing racks are overheating dangerously.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "high",
    true_case_id: "CASE-HARD-SERVER-AC-FAIL"
  },
  {
    id: "BM-142",
    text: "Bus pass deduction was charged twice from my fee balance, but transport desk says to ask accounts.",
    language: "en",
    true_department: "Administration",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-BUS-FEE-DUAL-CHARGE"
  },
  {
    id: "BM-143",
    text: "Need emergency burn ointment and eye wash saline replenished in the organic chemistry teaching laboratory.",
    language: "en",
    true_department: "Health",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-CHEM-LAB-EYEWASH"
  },
  {
    id: "BM-144",
    text: "Need extra copy of the novel 'Catching Fire' for English literature assignment from library reserves.",
    language: "en",
    true_department: "Library",
    true_urgency: "low",
    true_case_id: "CASE-HARD-CATCHING-FIRE-BOOK"
  },
  {
    id: "BM-145",
    text: "Our student robotics team gave a fire-cracking performance at the symposium and needs travel reimbursement form.",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-HARD-ROBOTICS-TRAVEL-REIMBURSE"
  },
  {
    id: "BM-146",
    text: "Corridor light bulb has flickered off; there is no smoke or burning odor, just needs simple bulb replacement.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "low",
    true_case_id: "CASE-HARD-CORRIDOR-BULB-NO-SMOKE"
  },
  {
    id: "BM-147",
    text: "Notice says fire drill simulation is scheduled for Block 3 tomorrow; which muster point should third floor report to?",
    language: "en",
    true_department: "Administration",
    true_urgency: "low",
    true_case_id: "CASE-HARD-FIRE-DRILL-MUSTER-QUERY"
  },
  {
    id: "BM-148",
    text: "Morning 7:30 South Gate shuttle bus was on time, but evening 6:00 PM return shuttle from North Gate never arrived.",
    language: "en",
    true_department: "Transport",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-SHUTTLE-NORTH-EVENING"
  },
  {
    id: "BM-149",
    text: "Hostel A room 102 ceiling fan speed regulator broken, stuck on speed 5.",
    language: "en",
    true_department: "Hostel",
    true_urgency: "low",
    true_case_id: "CASE-HARD-FAN-REGULATOR-HOSTEL-A"
  },
  {
    id: "BM-150",
    text: "Ma room lo fan tiragatledu chala sound vastondi, night padukoleka pothunnam.",
    language: "mixed",
    true_department: "Hostel",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-TELUGU-ROMAN-FAN-NOISE"
  },
  {
    id: "BM-151",
    text: "Mess ka khana bilkul kharab hai, teen doston ka pet kharab ho gaya aur vomit hui.",
    language: "mixed",
    true_department: "Mess/Food",
    true_urgency: "high",
    true_case_id: "CASE-HARD-HINDI-ROMAN-FOOD-POISON"
  },
  {
    id: "BM-152",
    text: "లాబ్‌లో ప్రయోగం చేస్తుండగా విద్యుత్ షాక్ తగిలి విద్యార్థి స్పృహతప్పి పడిపోయాడు.",
    language: "te",
    true_department: "Health",
    true_urgency: "critical",
    true_case_id: "CASE-HARD-TE-SCRIPT-SHOCK-UNCONSCIOUS"
  },
  {
    id: "BM-153",
    text: "परीक्षा हाल में एसी और पंखे दोनों बंद हैं, अत्यधिक गर्मी के कारण एक छात्रा को चक्कर आ गया।",
    language: "hi",
    true_department: "Health",
    true_urgency: "high",
    true_case_id: "CASE-HARD-HI-SCRIPT-EXAM-HEAT-FAINT"
  },
  {
    id: "BM-154",
    text: "Stray dogs entered the open dining hall and were fighting near the salad counter.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-HARD-STRAY-DOGS-MESS"
  },
  {
    id: "BM-155",
    text: "Online examination portal timer counted down 10 minutes faster than the wall clock during end-term quiz.",
    language: "en",
    true_department: "Academics",
    true_urgency: "high",
    true_case_id: "CASE-HARD-EXAM-TIMER-GLITCH"
  },
  {
    id: "BM-156",
    text: "Rainwater backflowing into the ground-floor library archive room where historical manuscripts are stored.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "critical",
    true_case_id: "CASE-HARD-LIBRARY-ARCHIVE-FLOODING"
  },
  {
    id: "BM-157",
    text: "Campus bank branch ATM card skimmer suspected on machine outside student activity centre.",
    language: "en",
    true_department: "Security",
    true_urgency: "high",
    true_case_id: "CASE-HARD-ATM-SKIMMER-SUSPECTED"
  },
  {
    id: "BM-158",
    text: "Mess fee refund after semester withdrawal has been pending for four months without status update.",
    language: "en",
    true_department: "Administration",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-MESS-REFUND-PENDING"
  },
  {
    id: "BM-159",
    text: "Library computer lab headphone jacks are giving mild static electrical tingle to student ears.",
    language: "en",
    true_department: "Maintenance/Infrastructure",
    true_urgency: "high",
    true_case_id: "CASE-HARD-HEADPHONE-STATIC-SHOCK"
  },
  {
    id: "BM-160",
    text: "Biometrics scanner at academic gate 1 not recognizing thumbprints when hands are cold in early morning.",
    language: "en",
    true_department: "IT/Network",
    true_urgency: "medium",
    true_case_id: "CASE-HARD-BIOMETRIC-THUMBPRINT-COLD"
  }
];

fs.writeFileSync(OUT_PATH, JSON.stringify(benchmarkData, null, 2), "utf8");
console.log(`Generated ${benchmarkData.length} labeled benchmark rows to ${OUT_PATH}`);

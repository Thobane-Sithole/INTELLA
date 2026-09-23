


// WORLDWIDE COUNTRY LIST (50+ countries)

export const COUNTRIES = [
    
    { code: "bangladesh", name: "Bangladesh", flag: "🇧🇩", board: "NCTB", language: "bn-BD" },
    { code: "india", name: "India", flag: "🇮🇳", board: "CBSE/ICSE/State", language: "en-IN" },
    { code: "pakistan", name: "Pakistan", flag: "🇵🇰", board: "Federal/Provincial", language: "ur-PK" },
    { code: "nepal", name: "Nepal", flag: "🇳🇵", board: "NEB", language: "ne-NP" },
    { code: "sri_lanka", name: "Sri Lanka", flag: "🇱🇰", board: "NIE", language: "si-LK" },
    { code: "china", name: "China", flag: "🇨🇳", board: "MOE", language: "zh-CN" },
    { code: "japan", name: "Japan", flag: "🇯🇵", board: "MEXT", language: "ja-JP" },
    { code: "south_korea", name: "South Korea", flag: "🇰🇷", board: "MOE", language: "ko-KR" },
    { code: "indonesia", name: "Indonesia", flag: "🇮🇩", board: "Kemendikbud", language: "id-ID" },
    { code: "malaysia", name: "Malaysia", flag: "🇲🇾", board: "MOE", language: "ms-MY" },
    { code: "philippines", name: "Philippines", flag: "🇵🇭", board: "DepEd", language: "en-PH" },
    { code: "vietnam", name: "Vietnam", flag: "🇻🇳", board: "MOET", language: "vi-VN" },
    { code: "thailand", name: "Thailand", flag: "🇹🇭", board: "MOE", language: "th-TH" },
    { code: "myanmar", name: "Myanmar", flag: "🇲🇲", board: "MOE", language: "my-MM" },
    { code: "singapore", name: "Singapore", flag: "🇸🇬", board: "MOE", language: "en-SG" },
    { code: "uae", name: "UAE", flag: "🇦🇪", board: "MOE", language: "ar-AE" },
    { code: "saudi_arabia", name: "Saudi Arabia", flag: "🇸🇦", board: "MOE", language: "ar-SA" },
    { code: "qatar", name: "Qatar", flag: "🇶🇦", board: "MOE", language: "ar-QA" },
    { code: "iran", name: "Iran", flag: "🇮🇷", board: "MOE", language: "fa-IR" },
    { code: "turkey", name: "Turkey", flag: "🇹🇷", board: "MEB", language: "tr-TR" },

    // Europe
    { code: "uk", name: "United Kingdom", flag: "🇬🇧", board: "GCSE/A-Level", language: "en-GB" },
    { code: "germany", name: "Germany", flag: "🇩🇪", board: "Abitur", language: "de-DE" },
    { code: "france", name: "France", flag: "🇫🇷", board: "Baccalauréat", language: "fr-FR" },
    { code: "spain", name: "Spain", flag: "🇪🇸", board: "Bachillerato", language: "es-ES" },
    { code: "italy", name: "Italy", flag: "🇮🇹", board: "Maturità", language: "it-IT" },
    { code: "netherlands", name: "Netherlands", flag: "🇳🇱", board: "VWO/HAVO", language: "nl-NL" },
    { code: "poland", name: "Poland", flag: "🇵🇱", board: "Matura", language: "pl-PL" },
    { code: "russia", name: "Russia", flag: "🇷🇺", board: "EGE", language: "ru-RU" },
    { code: "ukraine", name: "Ukraine", flag: "🇺🇦", board: "ZNO", language: "uk-UA" },

    
    { code: "usa", name: "United States", flag: "🇺🇸", board: "Common Core/State", language: "en-US" },
    { code: "canada", name: "Canada", flag: "🇨🇦", board: "Provincial", language: "en-CA" },
    { code: "mexico", name: "Mexico", flag: "🇲🇽", board: "SEP", language: "es-MX" },
    { code: "brazil", name: "Brazil", flag: "🇧🇷", board: "ENEM", language: "pt-BR" },
    { code: "argentina", name: "Argentina", flag: "🇦🇷", board: "National", language: "es-AR" },

    
    { code: "egypt", name: "Egypt", flag: "🇪🇬", board: "MOE", language: "ar-EG" },
    { code: "nigeria", name: "Nigeria", flag: "🇳🇬", board: "WAEC/NECO", language: "en-NG" },
    { code: "south_africa", name: "South Africa", flag: "🇿🇦", board: "DBE", language: "en-ZA" },
    { code: "kenya", name: "Kenya", flag: "🇰🇪", board: "KNEC", language: "en-KE" },
    { code: "ghana", name: "Ghana", flag: "🇬🇭", board: "WAEC", language: "en-GH" },
    { code: "morocco", name: "Morocco", flag: "🇲🇦", board: "MEN", language: "ar-MA" },

    // Oceania
    { code: "australia", name: "Australia", flag: "🇦🇺", board: "ATAR/State", language: "en-AU" },
    { code: "new_zealand", name: "New Zealand", flag: "🇳🇿", board: "NCEA", language: "en-NZ" },

    
    { code: "international", name: "International", flag: "🌍", board: "IB/Cambridge", language: "en-US" },
    { code: "other", name: "Other Country", flag: "🏳️", board: "Custom", language: "en-US" }
];


// EDUCATION LEVELS

export const EDUCATION_LEVELS = {
    
    primary: {
        id: "primary",
        name: "Primary School",
        icon: "📒",
        grades: ["1", "2", "3", "4", "5"],
        ageRange: "6-11",
        description: "Foundation education"
    },
    middle: {
        id: "middle",
        name: "Middle School",
        icon: "📗",
        grades: ["6", "7", "8"],
        ageRange: "11-14",
        description: "Intermediate education"
    },
    secondary: {
        id: "secondary",
        name: "Secondary School",
        icon: "📘",
        grades: ["9", "10"],
        ageRange: "14-16",
        description: "SSC/O-Level equivalent"
    },
    higher_secondary: {
        id: "higher_secondary",
        name: "Higher Secondary",
        icon: "📙",
        grades: ["11", "12"],
        ageRange: "16-18",
        description: "HSC/A-Level equivalent",
        streams: ["science", "commerce", "arts"]
    },

    // University Levels
    undergraduate: {
        id: "undergraduate",
        name: "Undergraduate (Bachelor's)",
        icon: "🎓",
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        duration: "4 years",
        description: "Bachelor's degree programs"
    },
    postgraduate: {
        id: "postgraduate",
        name: "Postgraduate (Master's)",
        icon: "🎓",
        years: ["1st Year", "2nd Year"],
        duration: "2 years",
        description: "Master's degree programs"
    },
    doctoral: {
        id: "doctoral",
        name: "Doctoral (PhD)",
        icon: "🎓",
        duration: "3-5 years",
        description: "Research degree"
    },

    
    diploma: {
        id: "diploma",
        name: "Diploma",
        icon: "📜",
        duration: "2-3 years",
        description: "Technical diploma programs"
    }
};


// ACADEMIC STREAMS & DEPARTMENTS

export const ACADEMIC_STREAMS = {
    
    science: {
        id: "science",
        name: "Science",
        icon: "🔬",
        level: "higher_secondary",
        coreSubjects: ["Physics", "Chemistry", "Mathematics"],
        optionalSubjects: ["Biology", "Higher Mathematics", "Computer Science"]
    },
    commerce: {
        id: "commerce",
        name: "Commerce",
        icon: "📊",
        level: "higher_secondary",
        coreSubjects: ["Accounting", "Business Studies", "Economics"],
        optionalSubjects: ["Mathematics", "Finance", "Statistics"]
    },
    arts: {
        id: "arts",
        name: "Arts/Humanities",
        icon: "🎨",
        level: "higher_secondary",
        coreSubjects: ["Literature", "History", "Geography"],
        optionalSubjects: ["Political Science", "Sociology", "Psychology", "Philosophy"]
    }
};

// ===========================================


export const UNIVERSITY_DEPARTMENTS = {
    // Engineering
    engineering: {
        id: "engineering",
        name: "Engineering",
        icon: "⚙️",
        programs: {
            cse: {
                code: "CSE",
                name: "Computer Science & Engineering",
                fullName: "Bachelor of Science in Computer Science & Engineering",
                semesters: 8,
                subjects: [
                    "Programming Fundamentals", "Discrete Mathematics", "Data Structures",
                    "Algorithms", "Database Systems", "Computer Architecture", "Operating Systems",
                    "Object-Oriented Programming", "Software Engineering", "Computer Networks",
                    "Artificial Intelligence", "Machine Learning", "Web Development",
                    "Mobile App Development", "Information Security", "Cloud Computing",
                    "Distributed Systems", "Deep Learning", "Digital Logic Design"
                ]
            },
            eee: {
                code: "EEE",
                name: "Electrical & Electronic Engineering",
                fullName: "Bachelor of Science in Electrical & Electronic Engineering",
                semesters: 8,
                subjects: [
                    "Circuit Analysis", "Electronics", "Signals & Systems", "Electromagnetics",
                    "Power Systems", "Control Systems", "Digital Signal Processing",
                    "Communication Systems", "VLSI Design", "Microprocessors"
                ]
            },
            me: {
                code: "ME",
                name: "Mechanical Engineering",
                semesters: 8,
                subjects: ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing"]
            },
            ce: {
                code: "CE",
                name: "Civil Engineering",
                semesters: 8,
                subjects: ["Structural Analysis", "Geotechnical Engineering", "Construction Management"]
            }
        }
    },

    
    business: {
        id: "business",
        name: "Business Administration",
        icon: "💼",
        programs: {
            bba: {
                code: "BBA",
                name: "Business Administration",
                fullName: "Bachelor of Business Administration",
                semesters: 8,
                subjects: [
                    "Principles of Management", "Financial Accounting", "Marketing",
                    "Business Statistics", "Microeconomics", "Macroeconomics",
                    "Organizational Behavior", "Human Resource Management",
                    "Financial Management", "Operations Management",
                    "Strategic Management", "Business Law", "Entrepreneurship"
                ]
            },
            accounting: {
                code: "ACC",
                name: "Accounting & Finance",
                semesters: 8,
                subjects: ["Cost Accounting", "Auditing", "Taxation", "Corporate Finance"]
            }
        }
    },

    
    medical: {
        id: "medical",
        name: "Medical Sciences",
        icon: "⚕️",
        programs: {
            mbbs: {
                code: "MBBS",
                name: "Medicine & Surgery",
                fullName: "Bachelor of Medicine, Bachelor of Surgery",
                years: 5,
                subjects: [
                    "Anatomy", "Physiology", "Biochemistry", "Pharmacology",
                    "Pathology", "Microbiology", "Forensic Medicine",
                    "Community Medicine", "Medicine", "Surgery", "Pediatrics",
                    "Obstetrics & Gynecology"
                ]
            },
            pharmacy: {
                code: "B.Pharm",
                name: "Pharmacy",
                semesters: 8,
                subjects: ["Pharmaceutics", "Pharmacology", "Medicinal Chemistry"]
            },
            nursing: {
                code: "BSN",
                name: "Nursing",
                years: 4,
                subjects: ["Nursing Fundamentals", "Medical-Surgical Nursing", "Community Health"]
            }
        }
    },

    // Science
    science: {
        id: "science",
        name: "Pure Sciences",
        icon: "🔬",
        programs: {
            physics: {
                code: "BSc Physics",
                name: "Physics",
                semesters: 8,
                subjects: ["Classical Mechanics", "Quantum Mechanics", "Electrodynamics", "Statistical Physics"]
            },
            chemistry: {
                code: "BSc Chemistry",
                name: "Chemistry",
                semesters: 8,
                subjects: ["Organic Chemistry", "Inorganic Chemistry", "Physical Chemistry", "Analytical Chemistry"]
            },
            mathematics: {
                code: "BSc Mathematics",
                name: "Mathematics",
                semesters: 8,
                subjects: ["Real Analysis", "Abstract Algebra", "Differential Equations", "Topology"]
            },
            biology: {
                code: "BSc Biology",
                name: "Biology",
                semesters: 8,
                subjects: ["Cell Biology", "Genetics", "Ecology", "Molecular Biology"]
            }
        }
    },

    
    arts: {
        id: "arts",
        name: "Arts & Social Sciences",
        icon: "📚",
        programs: {
            english: {
                code: "BA English",
                name: "English Literature",
                semesters: 8,
                subjects: ["British Literature", "American Literature", "Literary Criticism", "Linguistics"]
            },
            economics: {
                code: "BSS Economics",
                name: "Economics",
                semesters: 8,
                subjects: ["Microeconomics", "Macroeconomics", "Econometrics", "Development Economics"]
            },
            sociology: {
                code: "BSS Sociology",
                name: "Sociology",
                semesters: 8,
                subjects: ["Social Theory", "Research Methods", "Urban Sociology", "Gender Studies"]
            }
        }
    },

    
    law: {
        id: "law",
        name: "Law",
        icon: "⚖️",
        programs: {
            llb: {
                code: "LLB",
                name: "Law",
                fullName: "Bachelor of Laws",
                years: 4,
                subjects: ["Constitutional Law", "Criminal Law", "Contract Law", "International Law"]
            }
        }
    }
};

// ===========================================


export const CURRICULUM_DATA = {
    "bangladesh": {
        name: "Bangladesh",
        board: "NCTB",
        fullName: "National Curriculum and Textbook Board",
        language: "bn-BD",
        classes: {
            "1": { name: "Class 1", stream: null, subjects: ["Bangla", "English", "Mathematics", "Drawing"] },
            "2": { name: "Class 2", stream: null, subjects: ["Bangla", "English", "Mathematics", "Drawing"] },
            "3": { name: "Class 3", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies"] },
            "4": { name: "Class 4", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies"] },
            "5": { name: "Class 5", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies"] },
            "6": { name: "Class 6", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies", "ICT"] },
            "7": { name: "Class 7", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies", "ICT"] },
            "8": { name: "Class 8", stream: null, subjects: ["Bangla", "English", "Mathematics", "Science", "Social Studies", "ICT"] },
            "9": {
                name: "Class 9",
                streams: {
                    science: ["Bangla", "English", "Mathematics", "Physics", "Chemistry", "Biology", "ICT", "Higher Mathematics"],
                    arts: ["Bangla", "English", "Mathematics", "History", "Geography", "Civics", "Economics", "ICT"],
                    commerce: ["Bangla", "English", "Mathematics", "Accounting", "Business Studies", "Finance", "ICT"]
                }
            },
            "10": {
                name: "Class 10 (SSC)",
                streams: {
                    science: ["Bangla", "English", "Mathematics", "Physics", "Chemistry", "Biology", "ICT", "Higher Mathematics"],
                    arts: ["Bangla", "English", "Mathematics", "History", "Geography", "Civics", "Economics", "ICT"],
                    commerce: ["Bangla", "English", "Mathematics", "Accounting", "Business Studies", "Finance", "ICT"]
                }
            },
            "11": {
                name: "Class 11 (HSC 1st Year)",
                streams: {
                    science: ["Bangla", "English", "Physics", "Chemistry", "Biology/Higher Math", "ICT"],
                    arts: ["Bangla", "English", "History", "Islamic History", "Civics", "Economics", "ICT"],
                    commerce: ["Bangla", "English", "Accounting", "Business Studies", "Finance & Banking", "ICT"]
                }
            },
            "12": {
                name: "Class 12 (HSC 2nd Year)",
                streams: {
                    science: ["Bangla", "English", "Physics", "Chemistry", "Biology/Higher Math", "ICT"],
                    arts: ["Bangla", "English", "History", "Islamic History", "Civics", "Economics", "ICT"],
                    commerce: ["Bangla", "English", "Accounting", "Business Studies", "Finance & Banking", "ICT"]
                }
            }
        },
        subjects: {
            physics: {
                name: "Physics",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Physical Quantities and Measurement", topics: ["Units", "Dimensions", "Errors"] },
                        { number: 2, name: "Motion", topics: ["Speed", "Velocity", "Acceleration", "Equations of Motion"] },
                        { number: 3, name: "Force", topics: ["Newton's Laws", "Friction", "Momentum"] },
                        { number: 4, name: "Work, Energy and Power", topics: ["Work", "Kinetic Energy", "Potential Energy", "Conservation"] },
                        { number: 5, name: "Matter", topics: ["States of Matter", "Density", "Pressure"] },
                        { number: 6, name: "Sound", topics: ["Waves", "Frequency", "Echoes", "Doppler Effect"] },
                        { number: 7, name: "Light", topics: ["Reflection", "Refraction", "Lenses", "Mirrors", "Snell's Law"] },
                        { number: 8, name: "Static Electricity", topics: ["Charge", "Coulomb's Law", "Electric Field"] },
                        { number: 9, name: "Current Electricity", topics: ["Ohm's Law", "Circuits", "Resistance"] },
                        { number: 10, name: "Magnetism", topics: ["Magnetic Field", "Electromagnets"] }
                    ]
                }
            },
            chemistry: {
                name: "Chemistry",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Chemistry Introduction", topics: ["Atoms", "Molecules", "Elements"] },
                        { number: 2, name: "Atomic Structure", topics: ["Protons", "Neutrons", "Electrons", "Orbitals"] },
                        { number: 3, name: "Periodic Table", topics: ["Groups", "Periods", "Properties"] },
                        { number: 4, name: "Chemical Bonding", topics: ["Ionic", "Covalent", "Metallic"] },
                        { number: 5, name: "Chemical Reactions", topics: ["Types", "Balancing", "Rates"] },
                        { number: 6, name: "Acids, Bases and Salts", topics: ["pH", "Neutralization", "Indicators"] },
                        { number: 7, name: "Organic Chemistry", topics: ["Hydrocarbons", "Functional Groups"] }
                    ]
                }
            },
            mathematics: {
                name: "Mathematics",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Real Numbers", topics: ["Rational", "Irrational", "Properties"] },
                        { number: 2, name: "Sets and Functions", topics: ["Set Theory", "Functions", "Relations"] },
                        { number: 3, name: "Algebraic Expressions", topics: ["Polynomials", "Factoring"] },
                        { number: 4, name: "Equations", topics: ["Linear", "Quadratic", "Systems"] },
                        { number: 5, name: "Geometry", topics: ["Triangles", "Circles", "Theorems"] },
                        { number: 6, name: "Trigonometry", topics: ["Ratios", "Identities", "Applications"] },
                        { number: 7, name: "Statistics", topics: ["Mean", "Median", "Mode", "Probability"] },
                        { number: 8, name: "Coordinate Geometry", topics: ["Distance", "Slope", "Lines"] }
                    ]
                }
            },
            biology: {
                name: "Biology",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Introduction to Biology", topics: ["Life Characteristics", "Classification"] },
                        { number: 2, name: "Cell", topics: ["Structure", "Organelles", "Division"] },
                        { number: 3, name: "Cell Division", topics: ["Mitosis", "Meiosis"] },
                        { number: 4, name: "Plant Biology", topics: ["Photosynthesis", "Transport", "Reproduction"] },
                        { number: 5, name: "Animal Biology", topics: ["Digestion", "Circulation", "Respiration"] },
                        { number: 6, name: "Human Body", topics: ["Systems", "Health", "Diseases"] },
                        { number: 7, name: "Genetics", topics: ["DNA", "Heredity", "Mutations"] },
                        { number: 8, name: "Ecology", topics: ["Ecosystems", "Food Chains", "Environment"] }
                    ]
                }
            },
            english: {
                name: "English",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Grammar", topics: ["Tenses", "Voice", "Narration", "Prepositions"] },
                        { number: 2, name: "Composition", topics: ["Essays", "Letters", "Applications"] },
                        { number: 3, name: "Comprehension", topics: ["Reading", "Summary", "Analysis"] },
                        { number: 4, name: "Vocabulary", topics: ["Synonyms", "Antonyms", "Idioms"] }
                    ]
                }
            },
            ict: {
                name: "ICT",
                chapters: {
                    "9-10": [
                        { number: 1, name: "Introduction to ICT", topics: ["Hardware", "Software", "Internet"] },
                        { number: 2, name: "Number Systems", topics: ["Binary", "Decimal", "Conversions"] },
                        { number: 3, name: "Programming Basics", topics: ["Algorithms", "Flowcharts", "C Programming"] },
                        { number: 4, name: "Database", topics: ["DBMS", "SQL Basics", "Tables"] },
                        { number: 5, name: "Web Development", topics: ["HTML", "CSS", "Basics"] },
                        { number: 6, name: "Cyber Security", topics: ["Safety", "Ethics", "Privacy"] }
                    ]
                }
            }
        }
    },
    "india": {
        name: "India",
        board: "CBSE",
        fullName: "Central Board of Secondary Education",
        language: "en-IN",
        classes: {
            "9": {
                name: "Class 9",
                subjects: ["English", "Hindi", "Mathematics", "Science", "Social Science"]
            },
            "10": {
                name: "Class 10",
                subjects: ["English", "Hindi", "Mathematics", "Science", "Social Science"]
            },
            "11": {
                name: "Class 11",
                streams: {
                    science: ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
                    commerce: ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
                    arts: ["History", "Political Science", "Geography", "Economics", "English"]
                }
            },
            "12": {
                name: "Class 12",
                streams: {
                    science: ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
                    commerce: ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
                    arts: ["History", "Political Science", "Geography", "Economics", "English"]
                }
            }
        }
    }
};

// ===========================================



/**
 * Get country by code
 */
export function getCountry(code) {
    return COUNTRIES.find(c => c.code === code) || COUNTRIES.find(c => c.code === 'other');
}


export function getEducationLevel(levelId) {
    return EDUCATION_LEVELS[levelId] || null;
}


export function getStream(streamId) {
    return ACADEMIC_STREAMS[streamId] || null;
}

/**
 * Get university program info
 */
export function getUniversityProgram(departmentId, programId) {
    const department = UNIVERSITY_DEPARTMENTS[departmentId];
    if (!department) return null;
    return department.programs[programId] || null;
}


export function getDepartmentPrograms(departmentId) {
    const department = UNIVERSITY_DEPARTMENTS[departmentId];
    if (!department) return [];
    return Object.values(department.programs);
}


export function getSubjectsForProfile(profile) {
    const { educationLevel, stream, department, program, country, classNum } = profile;

    // University level
    if (educationLevel === 'undergraduate' || educationLevel === 'postgraduate') {
        if (department && program) {
            const prog = getUniversityProgram(department, program);
            return prog?.subjects || [];
        }
    }

    
    if (educationLevel === 'higher_secondary' && stream) {
        const streamInfo = getStream(stream);
        return [...(streamInfo?.coreSubjects || []), ...(streamInfo?.optionalSubjects || [])];
    }

    
    if (country && classNum) {
        return getSubjectsForClass(country, classNum, stream);
    }

    return [];
}

/**
 * Search all countries
 */
export function searchCountries(query) {
    const q = query.toLowerCase();
    return COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.board.toLowerCase().includes(q)
    );
}


export function getCountriesByRegion() {
    return {
        asia: COUNTRIES.filter(c => ['bangladesh', 'india', 'pakistan', 'nepal', 'sri_lanka', 'china', 'japan', 'south_korea', 'indonesia', 'malaysia', 'philippines', 'vietnam', 'thailand', 'myanmar', 'singapore', 'uae', 'saudi_arabia', 'qatar', 'iran', 'turkey'].includes(c.code)),
        europe: COUNTRIES.filter(c => ['uk', 'germany', 'france', 'spain', 'italy', 'netherlands', 'poland', 'russia', 'ukraine'].includes(c.code)),
        americas: COUNTRIES.filter(c => ['usa', 'canada', 'mexico', 'brazil', 'argentina'].includes(c.code)),
        africa: COUNTRIES.filter(c => ['egypt', 'nigeria', 'south_africa', 'kenya', 'ghana', 'morocco'].includes(c.code)),
        oceania: COUNTRIES.filter(c => ['australia', 'new_zealand'].includes(c.code)),
        other: COUNTRIES.filter(c => ['international', 'other'].includes(c.code))
    };
}


export function getSubjectsForClass(country, classNum, stream = null) {
    const curriculum = CURRICULUM_DATA[country];
    if (!curriculum) return [];

    const classData = curriculum.classes[classNum];
    if (!classData) return [];

    if (classData.subjects) {
        return classData.subjects;
    }

    if (classData.streams && stream) {
        return classData.streams[stream] || [];
    }

    return [];
}

// Get chapters for a subject
export function getChaptersForSubject(country, subject, classNum) {
    const curriculum = CURRICULUM_DATA[country];
    if (!curriculum || !curriculum.subjects) return [];

    const subjectData = curriculum.subjects[subject.toLowerCase()];
    if (!subjectData) return [];

    
    for (const [range, chapters] of Object.entries(subjectData.chapters || {})) {
        const [start, end] = range.split('-').map(Number);
        if (classNum >= start && classNum <= end) {
            return chapters;
        }
    }

    return [];
}


export function searchCurriculum(country, query) {
    const curriculum = CURRICULUM_DATA[country];
    if (!curriculum || !curriculum.subjects) return [];

    const results = [];
    const queryLower = query.toLowerCase();

    for (const [subjectKey, subject] of Object.entries(curriculum.subjects)) {
        for (const [classRange, chapters] of Object.entries(subject.chapters || {})) {
            for (const chapter of chapters) {
                // Search in chapter name
                if (chapter.name.toLowerCase().includes(queryLower)) {
                    results.push({
                        subject: subject.name,
                        chapter: chapter,
                        classRange,
                        match: 'chapter'
                    });
                }
                
                for (const topic of chapter.topics || []) {
                    if (topic.toLowerCase().includes(queryLower)) {
                        results.push({
                            subject: subject.name,
                            chapter: chapter,
                            topic: topic,
                            classRange,
                            match: 'topic'
                        });
                    }
                }
            }
        }
    }

    return results;
}


// EXPORT DEFAULT

export default {
    COUNTRIES,
    EDUCATION_LEVELS,
    ACADEMIC_STREAMS,
    UNIVERSITY_DEPARTMENTS,
    CURRICULUM_DATA,
    getCountry,
    getEducationLevel,
    getStream,
    getUniversityProgram,
    getDepartmentPrograms,
    getSubjectsForProfile,
    searchCountries,
    getCountriesByRegion,
    getSubjectsForClass,
    getChaptersForSubject,
    searchCurriculum
};

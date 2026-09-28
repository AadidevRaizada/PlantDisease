// Crop + disease knowledge base. Class ids ("<crop>___<condition>") must match
// the model's labels.json. Marathi text should be reviewed by a local agronomist.

export type Lang = 'en' | 'mr';
export type Text = Record<Lang, string>;

export interface Condition {
  id: string;
  healthy?: boolean;
  name: Text;
  symptoms: Text;
  treatment: Text;
}

export interface Crop {
  id: string;
  emoji: string;
  name: Text;
  conditions: Condition[];
}

const healthy = (crop: string): Condition => ({
  id: `${crop}___healthy`,
  healthy: true,
  name: { en: 'Healthy', mr: 'निरोगी' },
  symptoms: { en: 'No disease signs detected on the leaf.', mr: 'पानावर रोगाची लक्षणे आढळली नाहीत.' },
  treatment: {
    en: 'Keep up regular watering, balanced fertiliser and field checks.',
    mr: 'नियमित पाणी, संतुलित खत आणि शेताची नियमित पाहणी सुरू ठेवा.',
  },
});

export const CROPS: Crop[] = [
  {
    id: 'sugarcane',
    emoji: '🎋',
    name: { en: 'Sugarcane', mr: 'ऊस' },
    conditions: [
      healthy('sugarcane'),
      {
        id: 'sugarcane___red_rot',
        name: { en: 'Red rot', mr: 'लाल कूज' },
        symptoms: {
          en: 'Leaves yellow and dry from the tip; red patches with white spots inside the split cane.',
          mr: 'पाने टोकापासून पिवळी पडून वाळतात; ऊस चिरल्यावर आत पांढरे ठिपके असलेले लाल भाग दिसतात.',
        },
        treatment: {
          en: 'Use disease-free setts, treat setts with carbendazim, remove and burn infected clumps, rotate crops.',
          mr: 'रोगमुक्त बेणे वापरा, बेण्याला कार्बेन्डाझिमची प्रक्रिया करा, रोगट बेटे उपटून जाळा, पिकांची फेरपालट करा.',
        },
      },
      {
        id: 'sugarcane___rust',
        name: { en: 'Rust', mr: 'तांबेरा' },
        symptoms: {
          en: 'Small orange-brown pustules on both leaf surfaces that rub off as powder.',
          mr: 'पानांच्या दोन्ही बाजूंवर लहान नारिंगी-तपकिरी पुटकुळ्या, ज्या घासल्यावर भुकटीसारख्या निघतात.',
        },
        treatment: {
          en: 'Grow resistant varieties; spray mancozeb or propiconazole when first seen.',
          mr: 'प्रतिकारक्षम जाती लावा; लक्षणे दिसताच मॅन्कोझेब किंवा प्रोपिकोनाझोलची फवारणी करा.',
        },
      },
    ],
  },
  {
    id: 'cotton',
    emoji: '☁️',
    name: { en: 'Cotton', mr: 'कापूस' },
    conditions: [
      healthy('cotton'),
      {
        id: 'cotton___bacterial_blight',
        name: { en: 'Bacterial blight', mr: 'जिवाणूजन्य करपा' },
        symptoms: {
          en: 'Angular water-soaked spots on leaves that turn brown-black, often along veins.',
          mr: 'पानांवर पाणथळ कोनाकृती ठिपके, जे नंतर तपकिरी-काळे होतात, बहुधा शिरांच्या बाजूने.',
        },
        treatment: {
          en: 'Use treated seed, remove crop debris, spray copper oxychloride with streptocycline.',
          mr: 'प्रक्रिया केलेले बियाणे वापरा, पिकाचे अवशेष नष्ट करा, कॉपर ऑक्सिक्लोराईड व स्ट्रेप्टोसायक्लीनची फवारणी करा.',
        },
      },
      {
        id: 'cotton___leaf_curl',
        name: { en: 'Leaf curl virus', mr: 'पाने मुरडणे (लीफ कर्ल)' },
        symptoms: {
          en: 'Leaves curl upward or downward, veins thicken, plants become stunted. Spread by whitefly.',
          mr: 'पाने वर किंवा खाली मुरडतात, शिरा जाड होतात, झाडाची वाढ खुंटते. पांढरी माशी रोग पसरवते.',
        },
        treatment: {
          en: 'Control whitefly (yellow sticky traps, neem oil), remove infected plants early.',
          mr: 'पांढऱ्या माशीचे नियंत्रण करा (पिवळे चिकट सापळे, निंबोळी तेल), रोगट झाडे लवकर उपटून टाका.',
        },
      },
    ],
  },
  {
    id: 'soybean',
    emoji: '🫘',
    name: { en: 'Soybean', mr: 'सोयाबीन' },
    conditions: [
      healthy('soybean'),
      {
        id: 'soybean___rust',
        name: { en: 'Rust', mr: 'तांबेरा' },
        symptoms: {
          en: 'Tiny tan to reddish-brown spots on the underside of leaves; leaves yellow and drop early.',
          mr: 'पानांच्या खालच्या बाजूस लहान तपकिरी-लालसर ठिपके; पाने पिवळी होऊन लवकर गळतात.',
        },
        treatment: {
          en: 'Spray hexaconazole or propiconazole at first symptoms; avoid late sowing.',
          mr: 'पहिली लक्षणे दिसताच हेक्साकोनाझोल किंवा प्रोपिकोनाझोलची फवारणी करा; उशिरा पेरणी टाळा.',
        },
      },
      {
        id: 'soybean___yellow_mosaic',
        name: { en: 'Yellow mosaic', mr: 'पिवळा मोझॅक' },
        symptoms: {
          en: 'Bright yellow and green patchy pattern on leaves; spread by whitefly.',
          mr: 'पानांवर पिवळे-हिरवे चट्टे; पांढरी माशी रोग पसरवते.',
        },
        treatment: {
          en: 'Remove infected plants, control whitefly, grow tolerant varieties.',
          mr: 'रोगट झाडे काढून टाका, पांढऱ्या माशीचे नियंत्रण करा, सहनशील जाती लावा.',
        },
      },
    ],
  },
  {
    id: 'rice',
    emoji: '🌾',
    name: { en: 'Rice (Paddy)', mr: 'भात' },
    conditions: [
      healthy('rice'),
      {
        id: 'rice___blast',
        name: { en: 'Blast', mr: 'करपा (ब्लास्ट)' },
        symptoms: {
          en: 'Spindle / eye-shaped spots with grey centres and brown edges on leaves.',
          mr: 'पानांवर राखाडी मध्य व तपकिरी कडा असलेले डोळ्याच्या आकाराचे ठिपके.',
        },
        treatment: {
          en: 'Avoid excess nitrogen; spray tricyclazole when spots appear.',
          mr: 'नत्राचा अतिवापर टाळा; ठिपके दिसताच ट्रायसायक्लाझोलची फवारणी करा.',
        },
      },
      {
        id: 'rice___bacterial_leaf_blight',
        name: { en: 'Bacterial leaf blight', mr: 'कडा करपा' },
        symptoms: {
          en: 'Leaf edges turn yellow then straw-coloured, starting from the tip.',
          mr: 'पानांच्या कडा टोकापासून पिवळ्या व नंतर गवतासारख्या पांढुरक्या होतात.',
        },
        treatment: {
          en: 'Drain the field briefly, avoid excess nitrogen, spray copper-based bactericide.',
          mr: 'शेतातील पाणी काही काळ काढून टाका, नत्राचा अतिवापर टाळा, तांबेयुक्त औषधाची फवारणी करा.',
        },
      },
      {
        id: 'rice___brown_spot',
        name: { en: 'Brown spot', mr: 'तपकिरी ठिपके' },
        symptoms: {
          en: 'Oval brown spots with a yellow halo scattered across the leaf.',
          mr: 'पानावर पिवळसर कडा असलेले अंडाकृती तपकिरी ठिपके.',
        },
        treatment: {
          en: 'Correct soil nutrient deficiency (potash), treat seed, spray mancozeb.',
          mr: 'जमिनीतील पोषक कमतरता (पालाश) दूर करा, बीजप्रक्रिया करा, मॅन्कोझेबची फवारणी करा.',
        },
      },
    ],
  },
  {
    id: 'tomato',
    emoji: '🍅',
    name: { en: 'Tomato', mr: 'टोमॅटो' },
    conditions: [
      healthy('tomato'),
      {
        id: 'tomato___early_blight',
        name: { en: 'Early blight', mr: 'लवकर येणारा करपा' },
        symptoms: {
          en: 'Brown spots with target-like rings on older leaves, with yellowing around them.',
          mr: 'जुन्या पानांवर वर्तुळाकार वलये असलेले तपकिरी ठिपके व भोवती पिवळेपणा.',
        },
        treatment: {
          en: 'Remove lower infected leaves, mulch, spray mancozeb or chlorothalonil.',
          mr: 'खालची रोगट पाने काढा, आच्छादन करा, मॅन्कोझेब किंवा क्लोरोथॅलोनिलची फवारणी करा.',
        },
      },
      {
        id: 'tomato___late_blight',
        name: { en: 'Late blight', mr: 'उशिरा येणारा करपा' },
        symptoms: {
          en: 'Large dark water-soaked patches, white fungal growth underneath in humid weather.',
          mr: 'मोठे गडद पाणथळ चट्टे; दमट हवामानात पानाखाली पांढरी बुरशी दिसते.',
        },
        treatment: {
          en: 'Remove infected plants quickly, avoid overhead watering, spray metalaxyl + mancozeb.',
          mr: 'रोगट झाडे त्वरित काढा, वरून पाणी देणे टाळा, मेटॅलॅक्सिल + मॅन्कोझेबची फवारणी करा.',
        },
      },
      {
        id: 'tomato___leaf_curl',
        name: { en: 'Yellow leaf curl virus', mr: 'पिवळा पर्णगुच्छ (लीफ कर्ल)' },
        symptoms: {
          en: 'Small, curled, yellow-edged leaves; bushy stunted plants. Spread by whitefly.',
          mr: 'लहान, मुरडलेली, पिवळ्या कडांची पाने; झाड खुंटते. पांढरी माशी रोग पसरवते.',
        },
        treatment: {
          en: 'Use resistant hybrids, insect-net nursery, control whitefly, remove infected plants.',
          mr: 'प्रतिकारक्षम संकरित वाण वापरा, रोपवाटिकेला कीटकरोधक जाळी लावा, पांढऱ्या माशीचे नियंत्रण करा.',
        },
      },
    ],
  },
];

export const CONDITION_INDEX = new Map(
  CROPS.flatMap((crop) => crop.conditions.map((c) => [c.id, { crop, condition: c }] as const)),
);

export const UI: Record<string, Text> = {
  title: { en: 'Plant Doctor', mr: 'पीक डॉक्टर' },
  subtitle: { en: 'Snap a leaf, find the disease', mr: 'पानाचा फोटो घ्या, रोग ओळखा' },
  openCamera: { en: 'Open camera', mr: 'कॅमेरा उघडा' },
  capture: { en: 'Capture', mr: 'फोटो घ्या' },
  upload: { en: 'Upload photo', mr: 'फोटो निवडा' },
  retake: { en: 'Try another leaf', mr: 'दुसरे पान तपासा' },
  analysing: { en: 'Analysing leaf…', mr: 'पान तपासत आहे…' },
  listen: { en: 'Listen', mr: 'ऐका' },
  symptoms: { en: 'Symptoms', mr: 'लक्षणे' },
  treatment: { en: 'What to do', mr: 'उपाय' },
  confidence: { en: 'Confidence', mr: 'खात्री' },
  otherMatches: { en: 'Other possibilities', mr: 'इतर शक्यता' },
  supported: { en: 'Supported crops', mr: 'समर्थित पिके' },
  demo: {
    en: 'DEMO MODE: no trained model installed yet, results are random.',
    mr: 'डेमो मोड: प्रशिक्षित मॉडेल अजून नाही, निकाल यादृच्छिक आहेत.',
  },
  lowConfidence: {
    en: 'Not sure. Retake the photo with one leaf filling the frame, in daylight.',
    mr: 'खात्री नाही. दिवसाच्या प्रकाशात एकच पान फ्रेम भरून पुन्हा फोटो घ्या.',
  },
  noCamera: { en: 'Camera not available. Upload a photo instead.', mr: 'कॅमेरा उपलब्ध नाही. त्याऐवजी फोटो निवडा.' },
};

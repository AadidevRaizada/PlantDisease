// Crop + disease knowledge base, shared by the scanner and the simulator game.
// Condition ids ("<crop>___<condition>") must match the model's labels.json.
// Marathi text should be reviewed by a local agronomist / KVK.

export type Lang = 'en' | 'mr';
export type Text = Record<Lang, string>;

export type Vector = 'whitefly' | 'aphid' | 'leafhopper';
export type DiseaseKind = 'fungal' | 'bacterial' | 'viral' | 'soil';

/** Simplified epidemiology used by the simulator. */
export interface DiseaseSim {
  kind: DiseaseKind;
  /** [min, optimum, max] °C where infection can happen */
  temp: [number, number, number];
  /** humidity % above which risk starts rising */
  hum: number;
  /** 0..1 how much rain / wet leaves matter */
  wet: number;
  /** insect that spreads it (viral diseases) */
  vector?: Vector;
  /** +1: high nitrogen makes it worse, -1: low nitrogen makes it worse */
  nitrogen?: 1 | -1;
  /** spot colour drawn on the leaves */
  color: string;
  pattern: 'spots' | 'rings' | 'streaks' | 'mottle' | 'patches' | 'wilt' | 'curl' | 'pustules';
}

export interface Condition {
  id: string;
  healthy?: boolean;
  name: Text;
  symptoms: Text;
  treatment: Text;
  sim?: DiseaseSim;
}

export interface Crop {
  id: string;
  emoji: string;
  name: Text;
  /** growth needs for the simulator */
  grow: { days: number; temp: [number, number, number]; water: number; season: SeasonId };
  conditions: Condition[];
}

export type SeasonId = 'kharif' | 'rabi' | 'summer';

const t = (en: string, mr: string): Text => ({ en, mr });

const healthy = (crop: string): Condition => ({
  id: `${crop}___healthy`,
  healthy: true,
  name: t('Healthy', 'निरोगी'),
  symptoms: t('No disease signs detected on the leaf.', 'पानावर रोगाची लक्षणे आढळली नाहीत.'),
  treatment: t(
    'Keep up regular watering, balanced fertiliser and weekly field checks.',
    'नियमित पाणी, संतुलित खत आणि दर आठवड्याला शेताची पाहणी सुरू ठेवा.',
  ),
});

export const CROPS: Crop[] = [
  {
    id: 'sugarcane',
    emoji: '🎋',
    name: t('Sugarcane', 'ऊस'),
    grow: { days: 360, temp: [18, 30, 38], water: 2.5, season: 'kharif' },
    conditions: [
      healthy('sugarcane'),
      {
        id: 'sugarcane___red_rot',
        name: t('Red rot', 'लाल कूज'),
        symptoms: t(
          'Leaves yellow and dry from the tip; the split cane shows red patches with white bands.',
          'पाने टोकापासून पिवळी पडून वाळतात; ऊस चिरल्यावर आत पांढरे पट्टे असलेले लाल भाग दिसतात.',
        ),
        treatment: t(
          'Plant disease-free setts, treat setts with carbendazim, uproot and burn infected clumps, rotate crops.',
          'रोगमुक्त बेणे लावा, बेण्याला कार्बेन्डाझिमची प्रक्रिया करा, रोगट बेटे उपटून जाळा, पिकांची फेरपालट करा.',
        ),
        sim: { kind: 'fungal', temp: [22, 29, 35], hum: 80, wet: 0.9, color: '#b3372b', pattern: 'streaks' },
      },
      {
        id: 'sugarcane___rust',
        name: t('Rust', 'तांबेरा'),
        symptoms: t(
          'Small orange-brown pustules on the leaves that rub off as powder.',
          'पानांवर लहान नारिंगी-तपकिरी पुटकुळ्या, ज्या घासल्यावर भुकटीसारख्या निघतात.',
        ),
        treatment: t(
          'Grow resistant varieties; spray mancozeb or propiconazole when first seen.',
          'प्रतिकारक्षम जाती लावा; लक्षणे दिसताच मॅन्कोझेब किंवा प्रोपिकोनाझोलची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [15, 22, 30], hum: 75, wet: 0.6, color: '#c8641e', pattern: 'pustules' },
      },
      {
        id: 'sugarcane___mosaic',
        name: t('Mosaic', 'मोझॅक'),
        symptoms: t(
          'Light and dark green patchy stripes on young leaves; stunted canes.',
          'कोवळ्या पानांवर फिकट व गडद हिरव्या रंगाचे चट्टे; ऊस खुंटतो.',
        ),
        treatment: t(
          'Use virus-free setts, control aphids, remove infected clumps early.',
          'विषाणूमुक्त बेणे वापरा, मावा किडीचे नियंत्रण करा, रोगट बेटे लवकर काढा.',
        ),
        sim: { kind: 'viral', temp: [18, 25, 32], hum: 0, wet: 0, vector: 'aphid', color: '#c9d86a', pattern: 'mottle' },
      },
      {
        id: 'sugarcane___yellow_leaf',
        name: t('Yellow leaf disease', 'पिवळे पान रोग'),
        symptoms: t(
          'Midrib on the underside of leaves turns bright yellow, then the whole leaf yellows.',
          'पानाच्या खालच्या बाजूची मध्यशिर पिवळी होते, नंतर संपूर्ण पान पिवळे पडते.',
        ),
        treatment: t(
          'Use healthy tissue-culture setts and control aphids.',
          'निरोगी ऊती-संवर्धित बेणे वापरा आणि मावा किडीचे नियंत्रण करा.',
        ),
        sim: { kind: 'viral', temp: [20, 27, 34], hum: 0, wet: 0, vector: 'aphid', color: '#f1d13c', pattern: 'streaks' },
      },
    ],
  },
  {
    id: 'cotton',
    emoji: '☁️',
    name: t('Cotton', 'कापूस'),
    grow: { days: 160, temp: [20, 30, 38], water: 1.5, season: 'kharif' },
    conditions: [
      healthy('cotton'),
      {
        id: 'cotton___bacterial_blight',
        name: t('Bacterial blight', 'जिवाणूजन्य करपा'),
        symptoms: t(
          'Angular water-soaked spots that turn brown-black, often along the veins.',
          'पानांवर पाणथळ कोनाकृती ठिपके, जे नंतर तपकिरी-काळे होतात, बहुधा शिरांच्या बाजूने.',
        ),
        treatment: t(
          'Use treated seed, destroy crop debris, spray copper oxychloride with streptocycline.',
          'प्रक्रिया केलेले बियाणे वापरा, पिकाचे अवशेष नष्ट करा, कॉपर ऑक्सिक्लोराईड व स्ट्रेप्टोसायक्लीनची फवारणी करा.',
        ),
        sim: { kind: 'bacterial', temp: [25, 32, 38], hum: 80, wet: 1, color: '#4a3526', pattern: 'patches' },
      },
      {
        id: 'cotton___alternaria_leaf_spot',
        name: t('Alternaria leaf spot', 'अल्टरनेरिया पानठिपके'),
        symptoms: t(
          'Brown round spots with rings like a target; leaves may drop.',
          'पानांवर वलयांसारखे गोल तपकिरी ठिपके; पाने गळू शकतात.',
        ),
        treatment: t(
          'Remove fallen leaves, avoid overcrowding, spray mancozeb.',
          'गळलेली पाने गोळा करून नष्ट करा, दाट लागवड टाळा, मॅन्कोझेबची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [20, 26, 32], hum: 80, wet: 0.7, color: '#7a4a24', pattern: 'rings' },
      },
      {
        id: 'cotton___fusarium_wilt',
        name: t('Fusarium wilt', 'मर रोग (फ्युजेरियम)'),
        symptoms: t(
          'Leaves yellow from the edges and droop; the stem inside turns brown.',
          'पाने कडांपासून पिवळी होऊन मलूल होतात; खोडाच्या आतील भाग तपकिरी होतो.',
        ),
        treatment: t(
          'Grow resistant varieties, rotate crops, apply Trichoderma to the soil, avoid waterlogging.',
          'प्रतिकारक्षम जाती लावा, पिकांची फेरपालट करा, जमिनीत ट्रायकोडर्मा मिसळा, पाणी साचू देऊ नका.',
        ),
        sim: { kind: 'soil', temp: [23, 28, 34], hum: 0, wet: 0.8, color: '#d9b43a', pattern: 'wilt' },
      },
      {
        id: 'cotton___verticillium_wilt',
        name: t('Verticillium wilt', 'व्हर्टिसिलियम मर'),
        symptoms: t(
          'Yellow patches between veins, leaves dry and fall; worse in cool, wet soil.',
          'शिरांमधील भाग पिवळा होतो, पाने सुकून गळतात; थंड व ओलसर जमिनीत जास्त.',
        ),
        treatment: t(
          'Crop rotation with cereals, balanced nitrogen, resistant varieties.',
          'तृणधान्यांसोबत फेरपालट, संतुलित नत्र, प्रतिकारक्षम जाती.',
        ),
        sim: { kind: 'soil', temp: [18, 23, 28], hum: 0, wet: 0.7, nitrogen: 1, color: '#e0c24f', pattern: 'wilt' },
      },
    ],
  },
  {
    id: 'soybean',
    emoji: '🫘',
    name: t('Soybean', 'सोयाबीन'),
    grow: { days: 100, temp: [18, 27, 35], water: 1.8, season: 'kharif' },
    conditions: [
      healthy('soybean'),
      {
        id: 'soybean___rust',
        name: t('Rust', 'तांबेरा'),
        symptoms: t(
          'Tiny tan to reddish-brown spots under the leaves; leaves yellow and drop early.',
          'पानांच्या खालच्या बाजूस लहान तपकिरी-लालसर ठिपके; पाने पिवळी होऊन लवकर गळतात.',
        ),
        treatment: t(
          'Spray hexaconazole or propiconazole at first symptoms; avoid late sowing.',
          'पहिली लक्षणे दिसताच हेक्साकोनाझोल किंवा प्रोपिकोनाझोलची फवारणी करा; उशिरा पेरणी टाळा.',
        ),
        sim: { kind: 'fungal', temp: [15, 22, 28], hum: 85, wet: 0.8, color: '#b0561f', pattern: 'pustules' },
      },
      {
        id: 'soybean___bacterial_blight',
        name: t('Bacterial blight', 'जिवाणूजन्य करपा'),
        symptoms: t(
          'Small angular yellow-edged spots that merge into dead brown areas.',
          'पिवळ्या कडांचे लहान कोनाकृती ठिपके, जे एकत्र येऊन तपकिरी मृत भाग तयार करतात.',
        ),
        treatment: t(
          'Use clean seed, avoid working in wet fields, rotate crops, copper spray.',
          'स्वच्छ बियाणे वापरा, ओल्या शेतात काम टाळा, फेरपालट करा, तांबेयुक्त फवारणी करा.',
        ),
        sim: { kind: 'bacterial', temp: [18, 24, 30], hum: 80, wet: 1, color: '#5a3b22', pattern: 'patches' },
      },
      {
        id: 'soybean___frogeye_leaf_spot',
        name: t('Frogeye leaf spot', 'बेडूक-डोळा ठिपके'),
        symptoms: t(
          'Round grey spots with a dark reddish border, like a frog eye.',
          'गडद लालसर कडा असलेले गोल राखाडी ठिपके, बेडकाच्या डोळ्यासारखे.',
        ),
        treatment: t(
          'Resistant varieties, crop rotation, spray carbendazim or azoxystrobin.',
          'प्रतिकारक्षम जाती, पिकांची फेरपालट, कार्बेन्डाझिम किंवा ॲझोक्सिस्ट्रोबिनची फवारणी.',
        ),
        sim: { kind: 'fungal', temp: [22, 27, 32], hum: 80, wet: 0.7, color: '#8a8a80', pattern: 'rings' },
      },
    ],
  },
  {
    id: 'rice',
    emoji: '🌾',
    name: t('Rice (Paddy)', 'भात'),
    grow: { days: 120, temp: [20, 29, 36], water: 3, season: 'kharif' },
    conditions: [
      healthy('rice'),
      {
        id: 'rice___blast',
        name: t('Blast', 'करपा (ब्लास्ट)'),
        symptoms: t(
          'Eye-shaped spots with grey centres and brown edges on the leaves.',
          'पानांवर राखाडी मध्य व तपकिरी कडा असलेले डोळ्याच्या आकाराचे ठिपके.',
        ),
        treatment: t(
          'Avoid excess nitrogen; spray tricyclazole when spots appear.',
          'नत्राचा अतिवापर टाळा; ठिपके दिसताच ट्रायसायक्लाझोलची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [18, 25, 30], hum: 88, wet: 0.9, nitrogen: 1, color: '#8c7b6b', pattern: 'spots' },
      },
      {
        id: 'rice___bacterial_leaf_blight',
        name: t('Bacterial leaf blight', 'कडा करपा'),
        symptoms: t(
          'Leaf edges turn yellow then straw-coloured, starting from the tip.',
          'पानांच्या कडा टोकापासून पिवळ्या व नंतर गवतासारख्या पांढुरक्या होतात.',
        ),
        treatment: t(
          'Drain the field briefly, avoid excess nitrogen, spray a copper-based bactericide.',
          'शेतातील पाणी काही काळ काढून टाका, नत्राचा अतिवापर टाळा, तांबेयुक्त औषधाची फवारणी करा.',
        ),
        sim: { kind: 'bacterial', temp: [25, 30, 35], hum: 75, wet: 1, nitrogen: 1, color: '#e8d98a', pattern: 'streaks' },
      },
      {
        id: 'rice___brown_spot',
        name: t('Brown spot', 'तपकिरी ठिपके'),
        symptoms: t(
          'Oval brown spots with a yellow halo scattered across the leaf.',
          'पानावर पिवळसर कडा असलेले अंडाकृती तपकिरी ठिपके.',
        ),
        treatment: t(
          'Fix soil nutrient deficiency (potash, nitrogen), treat seed, spray mancozeb.',
          'जमिनीतील पोषक कमतरता (पालाश, नत्र) दूर करा, बीजप्रक्रिया करा, मॅन्कोझेबची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [22, 27, 32], hum: 85, wet: 0.6, nitrogen: -1, color: '#7b4a1e', pattern: 'spots' },
      },
      {
        id: 'rice___tungro',
        name: t('Tungro', 'टुंग्रो'),
        symptoms: t(
          'Leaves turn yellow-orange from the tip; plants are stunted with fewer tillers.',
          'पाने टोकापासून पिवळी-नारिंगी होतात; झाडे खुंटतात व फुटवे कमी येतात.',
        ),
        treatment: t(
          'Control green leafhoppers, remove infected plants, grow resistant varieties.',
          'हिरव्या तुडतुड्यांचे नियंत्रण करा, रोगट झाडे काढा, प्रतिकारक्षम जाती लावा.',
        ),
        sim: { kind: 'viral', temp: [24, 29, 34], hum: 0, wet: 0, vector: 'leafhopper', color: '#e9a23b', pattern: 'mottle' },
      },
    ],
  },
  {
    id: 'tomato',
    emoji: '🍅',
    name: t('Tomato', 'टोमॅटो'),
    grow: { days: 90, temp: [15, 24, 32], water: 1.5, season: 'rabi' },
    conditions: [
      healthy('tomato'),
      {
        id: 'tomato___early_blight',
        name: t('Early blight', 'लवकर येणारा करपा'),
        symptoms: t(
          'Brown spots with target-like rings on older leaves, with yellowing around them.',
          'जुन्या पानांवर वर्तुळाकार वलये असलेले तपकिरी ठिपके व भोवती पिवळेपणा.',
        ),
        treatment: t(
          'Remove lower infected leaves, mulch the soil, spray mancozeb or chlorothalonil.',
          'खालची रोगट पाने काढा, आच्छादन करा, मॅन्कोझेब किंवा क्लोरोथॅलोनिलची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [20, 27, 32], hum: 75, wet: 0.6, color: '#6b4423', pattern: 'rings' },
      },
      {
        id: 'tomato___late_blight',
        name: t('Late blight', 'उशिरा येणारा करपा'),
        symptoms: t(
          'Large dark water-soaked patches; white fungal growth underneath in humid weather.',
          'मोठे गडद पाणथळ चट्टे; दमट हवामानात पानाखाली पांढरी बुरशी दिसते.',
        ),
        treatment: t(
          'Remove infected plants quickly, avoid overhead watering, spray metalaxyl + mancozeb.',
          'रोगट झाडे त्वरित काढा, वरून पाणी देणे टाळा, मेटॅलॅक्सिल + मॅन्कोझेबची फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [12, 18, 24], hum: 88, wet: 1, color: '#3d3a2c', pattern: 'patches' },
      },
      {
        id: 'tomato___leaf_curl',
        name: t('Yellow leaf curl virus', 'पिवळा पर्णगुच्छ (लीफ कर्ल)'),
        symptoms: t(
          'Small, curled, yellow-edged leaves; bushy stunted plants. Spread by whitefly.',
          'लहान, मुरडलेली, पिवळ्या कडांची पाने; झाड खुंटते. पांढरी माशी रोग पसरवते.',
        ),
        treatment: t(
          'Use resistant hybrids, raise nursery under insect net, control whitefly, remove infected plants.',
          'प्रतिकारक्षम संकरित वाण वापरा, रोपवाटिकेला कीटकरोधक जाळी लावा, पांढऱ्या माशीचे नियंत्रण करा.',
        ),
        sim: { kind: 'viral', temp: [22, 30, 38], hum: 0, wet: 0, vector: 'whitefly', color: '#e3d44a', pattern: 'curl' },
      },
      {
        id: 'tomato___septoria_leaf_spot',
        name: t('Septoria leaf spot', 'सेप्टोरिया पानठिपके'),
        symptoms: t(
          'Many small round spots with grey centres and dark borders on lower leaves.',
          'खालच्या पानांवर राखाडी मध्य व गडद कडा असलेले अनेक लहान गोल ठिपके.',
        ),
        treatment: t(
          'Remove infected leaves, avoid wetting leaves, spray chlorothalonil or copper.',
          'रोगट पाने काढा, पाने ओली करणे टाळा, क्लोरोथॅलोनिल किंवा तांबेयुक्त फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [18, 24, 29], hum: 80, wet: 0.9, color: '#5b4a3a', pattern: 'spots' },
      },
      {
        id: 'tomato___bacterial_spot',
        name: t('Bacterial spot', 'जिवाणूजन्य ठिपके'),
        symptoms: t(
          'Small dark greasy spots on leaves and fruit, often with yellow halos.',
          'पाने व फळांवर लहान गडद तेलकट ठिपके, बहुधा पिवळ्या कडांसह.',
        ),
        treatment: t(
          'Use clean seed and transplants, avoid overhead irrigation, copper sprays.',
          'स्वच्छ बियाणे व रोपे वापरा, वरून पाणी देणे टाळा, तांबेयुक्त फवारणी करा.',
        ),
        sim: { kind: 'bacterial', temp: [22, 28, 33], hum: 80, wet: 1, color: '#2e2a20', pattern: 'spots' },
      },
      {
        id: 'tomato___mosaic_virus',
        name: t('Mosaic virus', 'मोझॅक विषाणू'),
        symptoms: t(
          'Light and dark green mosaic pattern; leaves may be puckered or fern-like.',
          'पानांवर फिकट व गडद हिरवा मोझॅकसारखा नमुना; पाने सुरकुतलेली दिसू शकतात.',
        ),
        treatment: t(
          'Remove infected plants, wash hands and tools, control aphids, avoid tobacco near plants.',
          'रोगट झाडे काढा, हात व अवजारे धुवा, मावा नियंत्रण करा, झाडांजवळ तंबाखू टाळा.',
        ),
        sim: { kind: 'viral', temp: [18, 25, 32], hum: 0, wet: 0, vector: 'aphid', color: '#b8cf5a', pattern: 'mottle' },
      },
      {
        id: 'tomato___leaf_mold',
        name: t('Leaf mould', 'पानावरील बुरशी (लीफ मोल्ड)'),
        symptoms: t(
          'Pale yellow patches on top of leaves with olive-green mould underneath.',
          'पानाच्या वरच्या बाजूस फिकट पिवळे चट्टे व खालच्या बाजूस ऑलिव्ह-हिरवी बुरशी.',
        ),
        treatment: t(
          'Improve air flow, lower humidity, remove affected leaves, spray copper or chlorothalonil.',
          'हवा खेळती ठेवा, आर्द्रता कमी करा, बाधित पाने काढा, तांबेयुक्त किंवा क्लोरोथॅलोनिल फवारणी करा.',
        ),
        sim: { kind: 'fungal', temp: [18, 23, 28], hum: 85, wet: 0.4, color: '#8f8a3a', pattern: 'mottle' },
      },
    ],
  },
];

export const OTHER_ID = 'other___unsupported';

export const CROP_INDEX = new Map(CROPS.map((c) => [c.id, c]));

export const CONDITION_INDEX = new Map(
  CROPS.flatMap((crop) => crop.conditions.map((c) => [c.id, { crop, condition: c }] as const)),
);

export const cropOf = (id: string) => CROP_INDEX.get(id.split('___')[0]);

export const VECTORS: Record<Vector, { name: Text; emoji: string; likes: Text }> = {
  whitefly: {
    name: t('Whitefly', 'पांढरी माशी'),
    emoji: '🦟',
    likes: t('hot, dry weather', 'उष्ण व कोरडे हवामान'),
  },
  aphid: {
    name: t('Aphids', 'मावा'),
    emoji: '🐜',
    likes: t('mild, dry weather', 'सौम्य व कोरडे हवामान'),
  },
  leafhopper: {
    name: t('Leafhoppers', 'तुडतुडे'),
    emoji: '🦗',
    likes: t('warm, humid weather and lots of nitrogen', 'उबदार, दमट हवामान व जास्त नत्र'),
  },
};

export const KIND_LABEL: Record<DiseaseKind, Text> = {
  fungal: t('Fungus', 'बुरशी'),
  bacterial: t('Bacteria', 'जिवाणू'),
  viral: t('Virus', 'विषाणू'),
  soil: t('Soil-borne fungus', 'जमिनीतील बुरशी'),
};

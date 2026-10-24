/** Languages the assistant speaks. Codes match what the language service expects. */
export const ASSISTANT_LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
  { code: 'ta-IN', label: 'தமிழ்' },
  { code: 'mr-IN', label: 'मराठी' },
  { code: 'bn-IN', label: 'বাংলা' },
] as const;

export type AssistantLanguage = (typeof ASSISTANT_LANGUAGES)[number]['code'];

/** Starter questions, by language, so a first-time user never faces a blank box. */
export const STARTERS: Record<AssistantLanguage, readonly string[]> = {
  'en-IN': ['When must I act to keep my licence valid?', 'What is holding my plan up?', 'What happens if my trip gets longer?', 'What will this cost?'],
  'hi-IN': ['मेरा लाइसेंस वैध रखने के लिए मुझे कब कदम उठाना होगा?', 'मेरी योजना किस वजह से रुकी है?', 'अगर मेरी यात्रा लंबी हो जाए तो क्या होगा?', 'इसमें कितना खर्च आएगा?'],
  'te-IN': ['నా లైసెన్స్ చెల్లుబాటులో ఉండాలంటే నేను ఎప్పుడు చర్య తీసుకోవాలి?', 'నా ప్లాన్‌ను ఏది ఆపుతోంది?', 'నా ప్రయాణం ఎక్కువైతే ఏమవుతుంది?', 'దీనికి ఎంత ఖర్చవుతుంది?'],
  'kn-IN': ['ನನ್ನ ಪರವಾನಗಿ ಮಾನ್ಯವಾಗಿರಲು ನಾನು ಯಾವಾಗ ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕು?', 'ನನ್ನ ಯೋಜನೆಯನ್ನು ಏನು ತಡೆಯುತ್ತಿದೆ?', 'ನನ್ನ ಪ್ರವಾಸ ಉದ್ದವಾದರೆ ಏನಾಗುತ್ತದೆ?', 'ಇದಕ್ಕೆ ಎಷ್ಟು ಖರ್ಚಾಗುತ್ತದೆ?'],
  'ta-IN': ['என் உரிமம் செல்லுபடியாக இருக்க நான் எப்போது நடவடிக்கை எடுக்க வேண்டும்?', 'என் திட்டத்தை எது தடுக்கிறது?', 'என் பயணம் நீண்டால் என்ன ஆகும்?', 'இதற்கு எவ்வளவு செலவாகும்?'],
  'mr-IN': ['माझे लायसन्स वैध ठेवण्यासाठी मला कधी कृती करावी लागेल?', 'माझी योजना कशामुळे अडली आहे?', 'माझा प्रवास लांबला तर काय होईल?', 'याचा खर्च किती येईल?'],
  'bn-IN': ['আমার লাইসেন্স বৈধ রাখতে আমাকে কখন পদক্ষেপ নিতে হবে?', 'আমার পরিকল্পনা কী আটকে রেখেছে?', 'আমার ভ্রমণ দীর্ঘ হলে কী হবে?', 'এতে কত খরচ হবে?'],
};

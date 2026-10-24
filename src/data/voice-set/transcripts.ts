/**
 * Benchmark Voice Transcript Set for Metric 2: Plate Capture Accuracy
 * 87 typed transcripts covering NATO, regional Indic numerals, multipliers,
 * positional look-alikes, Delhi class codes, BH-series, and invalid noise.
 */

export interface TranscriptItem {
  readonly id: string;
  readonly transcript: string;
  readonly expectedPlate: string | null;
  readonly category:
    | 'english-nato'
    | 'hindi-digits'
    | 'telugu-digits'
    | 'kannada-digits'
    | 'multiplier'
    | 'filler-words'
    | 'look-alikes'
    | 'delhi-class'
    | 'bh-series'
    | 'ambiguous-invalid';
  readonly note: string;
}

export const TRANSCRIPT_BENCHMARK_SET: readonly TranscriptItem[] = [
  // ==========================================
  // 1. English letter names & NATO words (10)
  // ==========================================
  {
    id: 'en-01',
    transcript: 'kay ay zero three em jay four five seven eight',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'english-nato',
    note: 'Standard letter names and single digits',
  },
  {
    id: 'en-02',
    transcript: 'kilo alpha zero three mike juliett four five seven eight',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'english-nato',
    note: 'Pure NATO phonetic alphabet',
  },
  {
    id: 'en-03',
    transcript: 'tee en zero nine charlie delta one two three four',
    expectedPlate: 'TN-09-CD-1234',
    category: 'english-nato',
    note: 'Mixed phonetic names and NATO alphabet',
  },
  {
    id: 'en-04',
    transcript: 'mike aitch zero two alpha bravo nine eight seven six',
    expectedPlate: 'MH-02-AB-9876',
    category: 'english-nato',
    note: 'Maharashtra Mumbai RTO with NATO series',
  },
  {
    id: 'en-05',
    transcript: 'dee el zero four see alpha five five four four',
    expectedPlate: 'DL-04-CA-5544',
    category: 'english-nato',
    note: 'Delhi North RTO with spelled letters',
  },
  {
    id: 'en-06',
    transcript: 'tee ess zero seven ee ef zero zero zero one',
    expectedPlate: 'TS-07-EF-0001',
    category: 'english-nato',
    note: 'Telangana Hyderabad RTO',
  },
  {
    id: 'en-07',
    transcript: 'golf juliet zero one papa quebec one one two two',
    expectedPlate: 'GJ-01-PQ-1122',
    category: 'english-nato',
    note: 'Gujarat Ahmedabad RTO with NATO',
  },
  {
    id: 'en-08',
    transcript: 'hotel romeo two six tango uniform three four five six',
    expectedPlate: 'HR-26-TU-3456',
    category: 'english-nato',
    note: 'Haryana Gurugram RTO',
  },
  {
    id: 'en-09',
    transcript: 'kilo lima zero seven victor whiskey seven eight nine zero',
    expectedPlate: 'KL-07-VW-7890',
    category: 'english-nato',
    note: 'Kerala Ernakulam RTO',
  },
  {
    id: 'en-10',
    transcript: 'papa bravo zero two xray yankee six five four three',
    expectedPlate: 'PB-02-XY-6543',
    category: 'english-nato',
    note: 'Punjab Amritsar RTO with NATO',
  },

  // ==========================================
  // 2. Hindi numeral transcripts (10)
  // ==========================================
  {
    id: 'hi-01',
    transcript: 'kay ay shunya teen em jay char panch sat aath',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'hindi-digits',
    note: 'Hindi shunya, teen, char, panch, sat, aath',
  },
  {
    id: 'hi-02',
    transcript: 'dee el shunya ek see dee do teen ek char',
    expectedPlate: 'DL-01-CD-2314',
    category: 'hindi-digits',
    note: 'Hindi shunya ek with series CD',
  },
  {
    id: 'hi-03',
    transcript: 'em aitch ek do bee ess paanch paanch paanch paanch',
    expectedPlate: 'MH-12-BS-5555',
    category: 'hindi-digits',
    note: 'Hindi ek do with repeating paanch',
  },
  {
    id: 'hi-04',
    transcript: 'tee ess shunya nau pee cue ek do teen char',
    expectedPlate: 'TS-09-PQ-1234',
    category: 'hindi-digits',
    note: 'Telangana TS-09 in Hindi numerals',
  },
  {
    id: 'hi-05',
    transcript: 'tee en shunya do ar ess aath nau shunya do',
    expectedPlate: 'TN-02-RS-8902',
    category: 'hindi-digits',
    note: 'Tamil Nadu Chennai Central in Hindi',
  },
  {
    id: 'hi-06',
    transcript: 'kay ay shunya char see ess aath nau ek do',
    expectedPlate: 'KA-04-CS-8912',
    category: 'hindi-digits',
    note: 'Bangalore North with Hindi numbers',
  },
  {
    id: 'hi-07',
    transcript: 'ar jay ek char vee doubleyou teen char panch chhe',
    expectedPlate: 'RJ-14-VW-3456',
    category: 'hindi-digits',
    note: 'Rajasthan Jaipur with Hindi numerals',
  },
  {
    id: 'hi-08',
    transcript: 'you pee teen do jay kay saat ath nau shunya',
    expectedPlate: 'UP-32-JK-7890',
    category: 'hindi-digits',
    note: 'Uttar Pradesh Lucknow with ath variant',
  },
  {
    id: 'hi-09',
    transcript: 'em pee shunya nau em en ek do teen char',
    expectedPlate: 'MP-09-MN-1234',
    category: 'hindi-digits',
    note: 'Madhya Pradesh Indore with Hindi digits',
  },
  {
    id: 'hi-10',
    transcript: 'jee jay shunya saat zee tee paanch chhe saat aath',
    expectedPlate: 'GJ-07-ZT-5678',
    category: 'hindi-digits',
    note: 'Gujarat Kheda in Hindi numerals',
  },

  // ==========================================
  // 3. Telugu numeral transcripts (10)
  // ==========================================
  {
    id: 'te-01',
    transcript: 'tee ess sunna edu em jay naalugu aidu edu enimidi',
    expectedPlate: 'TS-07-MJ-4578',
    category: 'telugu-digits',
    note: 'Telugu sunna, edu, naalugu, aidu, enimidi',
  },
  {
    id: 'te-02',
    transcript: 'ay pee sunna moodu bee see okati rendu moodu naalugu',
    expectedPlate: 'AP-03-BC-1234',
    category: 'telugu-digits',
    note: 'Andhra Tirupati RTO with Telugu numbers',
  },
  {
    id: 'te-03',
    transcript: 'tee ess sunna tommidi see cue aaru enimidi tommidi okati',
    expectedPlate: 'TS-09-CQ-6891',
    category: 'telugu-digits',
    note: 'Telugu numerals mixed phonetic',
  },
  {
    id: 'te-04',
    transcript: 'kay ay sunna moodu em jay aidu aaru edu enimidi',
    expectedPlate: 'KA-03-MJ-5678',
    category: 'telugu-digits',
    note: 'Karnataka RTO spoken with Telugu digits',
  },
  {
    id: 'te-05',
    transcript: 'tee en sunna okati dee ee tommidi enimidi edu aaru',
    expectedPlate: 'TN-01-DE-9876',
    category: 'telugu-digits',
    note: 'Tamil Nadu spoken in Telugu digits',
  },
  {
    id: 'te-06',
    transcript: 'tee ess okati sunna ar ess aidu naalugu moodu rendu',
    expectedPlate: 'TS-10-RS-5432',
    category: 'telugu-digits',
    note: 'Secunderabad RTO in Telugu digits',
  },
  {
    id: 'te-07',
    transcript: 'ay pee sunna aidu pee cue moodu moodu naalugu naalugu',
    expectedPlate: 'AP-05-PQ-3344',
    category: 'telugu-digits',
    note: 'Kakinada RTO in Telugu',
  },
  {
    id: 'te-08',
    transcript: 'tee ess okati rendu tee you sunna sunna sunna okati',
    expectedPlate: 'TS-12-TU-0001',
    category: 'telugu-digits',
    note: 'Telugu sunna repeating for single digit number',
  },
  {
    id: 'te-09',
    transcript: 'kay ay sunna okati vee doubleyou edu enimidi tommidi sunna',
    expectedPlate: 'KA-01-VW-7890',
    category: 'telugu-digits',
    note: 'Bangalore Central in Telugu digits',
  },
  {
    id: 'te-10',
    transcript: 'ay pee sunna tommidi ex why aaru edu enimidi tommidi',
    expectedPlate: 'AP-09-XY-6789',
    category: 'telugu-digits',
    note: 'Nellore RTO in Telugu digits',
  },

  // ==========================================
  // 4. Kannada numeral transcripts (10)
  // ==========================================
  {
    id: 'kn-01',
    transcript: 'kay ay sonne mooru em jay naalku aidu elu entu',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'kannada-digits',
    note: 'Kannada sonne, mooru, naalku, aidu, elu, entu',
  },
  {
    id: 'kn-02',
    transcript: 'kay ay sonne ondu bee see eradu mooru naalku aidu',
    expectedPlate: 'KA-01-BC-2345',
    category: 'kannada-digits',
    note: 'Bangalore Central RTO with Kannada numbers',
  },
  {
    id: 'kn-03',
    transcript: 'kay ay sonne eradu dee ee aaru elu entu ombattu',
    expectedPlate: 'KA-02-DE-6789',
    category: 'kannada-digits',
    note: 'Bangalore West with Kannada numbers',
  },
  {
    id: 'kn-04',
    transcript: 'kay ay sonne aidu ef jee ondu eradu mooru naalku',
    expectedPlate: 'KA-05-FG-1234',
    category: 'kannada-digits',
    note: 'Bangalore South Jayanagar in Kannada',
  },
  {
    id: 'kn-05',
    transcript: 'kay ay sonne naalku aitch jay aidu aidu aidu aidu',
    expectedPlate: 'KA-04-HJ-5555',
    category: 'kannada-digits',
    note: 'Bangalore North Yeshwantpur in Kannada',
  },
  {
    id: 'kn-06',
    transcript: 'kay ay eradu sonne kay el ondu sonne sonne sonne',
    expectedPlate: 'KA-20-KL-1000',
    category: 'kannada-digits',
    note: 'Udupi RTO in Kannada numbers',
  },
  {
    id: 'kn-07',
    transcript: 'kay ay eradu eradu em en eradu naalku aaru entu',
    expectedPlate: 'KA-22-MN-2468',
    category: 'kannada-digits',
    note: 'Belgaum RTO in Kannada numbers',
  },
  {
    id: 'kn-08',
    transcript: 'kay ay eradu aidu pee cue ondu mooru aidu elu',
    expectedPlate: 'KA-25-PQ-1357',
    category: 'kannada-digits',
    note: 'Dharwad RTO in Kannada numbers',
  },
  {
    id: 'kn-09',
    transcript: 'kay ay sonne entu ar ess entu elu aaru aidu',
    expectedPlate: 'KA-08-RS-8765',
    category: 'kannada-digits',
    note: 'Kolar RTO in Kannada numbers',
  },
  {
    id: 'kn-10',
    transcript: 'kay ay sonne elu tee you mooru eradu ondu sonne',
    expectedPlate: 'KA-07-TU-3210',
    category: 'kannada-digits',
    note: 'KGF RTO in Kannada numbers',
  },

  // ==========================================
  // 5. Multipliers: "double" / "triple" (10)
  // ==========================================
  {
    id: 'mult-01',
    transcript: 'ka zero three double em double four double four',
    expectedPlate: 'KA-03-MM-4444',
    category: 'multiplier',
    note: 'Double series letter and double digit pairs',
  },
  {
    id: 'mult-02',
    transcript: 'dl zero one see triple nine one',
    expectedPlate: 'DL-01-C-9991',
    category: 'multiplier',
    note: 'Triple nine numeral expansion',
  },
  {
    id: 'mult-03',
    transcript: 'mh one two double ay double zero zero one',
    expectedPlate: 'MH-12-AA-0001',
    category: 'multiplier',
    note: 'Double series A and double zero',
  },
  {
    id: 'mult-04',
    transcript: 'ts zero seven double bee one two three four',
    expectedPlate: 'TS-07-BB-1234',
    category: 'multiplier',
    note: 'Double series letter B',
  },
  {
    id: 'mult-05',
    transcript: 'ka zero five double see double nine double nine',
    expectedPlate: 'KA-05-CC-9999',
    category: 'multiplier',
    note: 'Double C double nine series',
  },
  {
    id: 'mult-06',
    transcript: 'tn zero two double dee five five six six',
    expectedPlate: 'TN-02-DD-5566',
    category: 'multiplier',
    note: 'Double series D in Chennai',
  },
  {
    id: 'mult-07',
    transcript: 'hr two six double ee seven triple seven',
    expectedPlate: 'HR-26-EE-7777',
    category: 'multiplier',
    note: 'Double E and triple seven in Gurugram',
  },
  {
    id: 'mult-08',
    transcript: 'gj zero one double ef one zero zero zero',
    expectedPlate: 'GJ-01-FF-1000',
    category: 'multiplier',
    note: 'Double F in Ahmedabad',
  },
  {
    id: 'mult-09',
    transcript: 'up three two double jee double four double five',
    expectedPlate: 'UP-32-GG-4455',
    category: 'multiplier',
    note: 'Double G series in Lucknow',
  },
  {
    id: 'mult-10',
    transcript: 'ka five one double zed double eight double two',
    expectedPlate: 'KA-51-ZZ-8822',
    category: 'multiplier',
    note: 'Electronic City Bangalore with double Z',
  },

  // ==========================================
  // 6. Filler words handling (8)
  // ==========================================
  {
    id: 'fill-01',
    transcript: 'my vehicle plate kay ay zero three em jay four five seven eight',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'filler-words',
    note: 'Leading conversational prefix with filler tokens',
  },
  {
    id: 'fill-02',
    transcript: 'the vehicle number is mh zero two ab one two three four',
    expectedPlate: 'MH-02-AB-1234',
    category: 'filler-words',
    note: 'Prefix: the vehicle number is',
  },
  {
    id: 'fill-03',
    transcript: 'uh my car plate is ka zero one cd five six seven eight um',
    expectedPlate: 'KA-01-CD-5678',
    category: 'filler-words',
    note: 'Hesitation tokens uh and um with car plate is',
  },
  {
    id: 'fill-04',
    transcript: 'gaadi number ts zero eight ef nine zero one two',
    expectedPlate: 'TS-08-EF-9012',
    category: 'filler-words',
    note: 'Hinglish gaadi number prefix',
  },
  {
    id: 'fill-05',
    transcript: 'bike vahan dl zero four gh three four five six',
    expectedPlate: 'DL-04-GH-3456',
    category: 'filler-words',
    note: 'Fillers: bike vahan',
  },
  {
    id: 'fill-06',
    transcript: 'uh um plate is tn zero two jk seven eight nine zero',
    expectedPlate: 'TN-02-JK-7890',
    category: 'filler-words',
    note: 'Multiple fillers before Chennai plate',
  },
  {
    id: 'fill-07',
    transcript: 'my vehicle ka zero five lm one one two two',
    expectedPlate: 'KA-05-LM-1122',
    category: 'filler-words',
    note: 'Fillers: my vehicle',
  },
  {
    id: 'fill-08',
    transcript: 'number is mh zero one en oh five five six six',
    expectedPlate: 'MH-01-NO-5566',
    category: 'filler-words',
    note: 'Fillers surrounding Mumbai plate',
  },

  // ==========================================
  // 7. Look-alikes across all positions (12)
  // ==========================================
  {
    id: 'look-01',
    transcript: 'KA O3 MJ 4578',
    expectedPlate: 'KA-03-MJ-4578',
    category: 'look-alikes',
    note: 'Letter O in RTO code position auto-corrected to digit 0',
  },
  {
    id: 'look-02',
    transcript: 'DL OI AB 1234',
    expectedPlate: 'DL-01-AB-1234',
    category: 'look-alikes',
    note: 'Letters O and I in RTO code corrected to 0 and 1',
  },
  {
    id: 'look-03',
    transcript: 'KA 08 B8 1234',
    expectedPlate: 'KA-08-BB-1234',
    category: 'look-alikes',
    note: 'Digit 8 in series position auto-corrected to letter B',
  },
  {
    id: 'look-04',
    transcript: 'MH 12 S5 5555',
    expectedPlate: 'MH-12-SS-5555',
    category: 'look-alikes',
    note: 'Digit 5 in series position auto-corrected to letter S',
  },
  {
    id: 'look-05',
    transcript: 'DL 02 Z2 2222',
    expectedPlate: 'DL-02-ZZ-2222',
    category: 'look-alikes',
    note: 'Digit 2 in series position auto-corrected to letter Z',
  },
  {
    id: 'look-06',
    transcript: 'TN 01 I1 1111',
    expectedPlate: 'TN-01-II-1111',
    category: 'look-alikes',
    note: 'Digit 1 in series position auto-corrected to letter I',
  },
  {
    id: 'look-07',
    transcript: 'TS 0D DD 0001',
    expectedPlate: 'TS-00-DD-0001',
    category: 'look-alikes',
    note: 'Letter D in RTO code position auto-corrected to digit 0',
  },
  {
    id: 'look-08',
    transcript: 'KA 06 G6 6789',
    expectedPlate: 'KA-06-GG-6789',
    category: 'look-alikes',
    note: 'Digit 6 in series position auto-corrected to letter G',
  },
  {
    id: 'look-09',
    transcript: 'HR 26 AB I234',
    expectedPlate: 'HR-26-AB-1234',
    category: 'look-alikes',
    note: 'Letter I in number position auto-corrected to digit 1',
  },
  {
    id: 'look-10',
    transcript: 'GJ 01 CD Z345',
    expectedPlate: 'GJ-01-CD-2345',
    category: 'look-alikes',
    note: 'Letter Z in number position auto-corrected to digit 2',
  },
  {
    id: 'look-11',
    transcript: 'MH 04 EE S678',
    expectedPlate: 'MH-04-EE-5678',
    category: 'look-alikes',
    note: 'Letter S in number position auto-corrected to digit 5',
  },
  {
    id: 'look-12',
    transcript: 'UP 16 GH B901',
    expectedPlate: 'UP-16-GH-8901',
    category: 'look-alikes',
    note: 'Letter B in number position auto-corrected to digit 8',
  },

  // ==========================================
  // 8. Delhi class-letter plates (6)
  // ==========================================
  {
    id: 'dl-01',
    transcript: 'DL 1C AB 1234',
    expectedPlate: 'DL-01-CAB-1234',
    category: 'delhi-class',
    note: 'Delhi Car class letter C preserved with series AB',
  },
  {
    id: 'dl-02',
    transcript: 'DL 2S XY 5678',
    expectedPlate: 'DL-02-SXY-5678',
    category: 'delhi-class',
    note: 'Delhi Two-Wheeler class letter S preserved with series XY',
  },
  {
    id: 'dl-03',
    transcript: 'DL 3C D 9999',
    expectedPlate: 'DL-03-CD-9999',
    category: 'delhi-class',
    note: 'Delhi Car class letter C with single letter series D',
  },
  {
    id: 'dl-04',
    transcript: 'DL 4S AA 0001',
    expectedPlate: 'DL-04-SAA-0001',
    category: 'delhi-class',
    note: 'Delhi Two-Wheeler class letter S with series AA',
  },
  {
    id: 'dl-05',
    transcript: 'dee el one see charlie delta one two three four',
    expectedPlate: 'DL-01-CCD-1234',
    category: 'delhi-class',
    note: 'Spoken Delhi car class code',
  },
  {
    id: 'dl-06',
    transcript: 'dee el two ess sierra tango five six seven eight',
    expectedPlate: 'DL-02-SST-5678',
    category: 'delhi-class',
    note: 'Spoken Delhi scooter class code',
  },

  // ==========================================
  // 9. BH-Series plates (5)
  // ==========================================
  {
    id: 'bh-01',
    transcript: '22 BH 1234 AA',
    expectedPlate: '22 BH 1234 AA',
    category: 'bh-series',
    note: 'Bharat series 2022 format',
  },
  {
    id: 'bh-02',
    transcript: '26 BH 9876 ZZ',
    expectedPlate: '26 BH 9876 ZZ',
    category: 'bh-series',
    note: 'Bharat series 2026 format with trailing series ZZ',
  },
  {
    id: 'bh-03',
    transcript: '24 BH 0001 AB',
    expectedPlate: '24 BH 0001 AB',
    category: 'bh-series',
    note: 'Bharat series 2024 single digit VIP format',
  },
  {
    id: 'bh-04',
    transcript: 'two three bee aitch five six seven eight see dee',
    expectedPlate: '23 BH 5678 CD',
    category: 'bh-series',
    note: 'Spoken Bharat series format',
  },
  {
    id: 'bh-05',
    transcript: '25 BH 4321 EF',
    expectedPlate: '25 BH 4321 EF',
    category: 'bh-series',
    note: 'Bharat series 2025 registration',
  },

  // ==========================================
  // 10. Ambiguous & Deliberately Invalid (6)
  // ==========================================
  {
    id: 'inv-01',
    transcript: 'invalid text with no numbers or state code',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Arbitrary prose without transport tokens',
  },
  {
    id: 'inv-02',
    transcript: 'xyz 999',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Unknown state code XYZ and incomplete digit sequence',
  },
  {
    id: 'inv-03',
    transcript: 'KA 999999',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Malformed plate: 6 digits with no series letters',
  },
  {
    id: 'inv-04',
    transcript: 'random audio static and background noise cough',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Acoustic artifacts without plate information',
  },
  {
    id: 'inv-05',
    transcript: 'plate is missing digits KA 03 MJ',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Truncated registration lacking 4-digit number',
  },
  {
    id: 'inv-06',
    transcript: '1234567890',
    expectedPlate: null,
    category: 'ambiguous-invalid',
    note: 'Numeric digits only without state prefix',
  },
];

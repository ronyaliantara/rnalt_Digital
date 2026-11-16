/* =========================================================================
   Modul Ajar Digital — IPA Kelas VII: Sistem Tata Surya
   DATA ILMIAH, SOAL KUIS, PETUNJUK GAME, GLOSARIUM
   Sumber data planet: NASA Planetary Fact Sheet (NSSDCA) & NASA Science
   "Solar System". Jumlah satelit planet raksasa terus bertambah seiring
   penemuan baru, sehingga ditulis sebagai "lebih dari ..." atau diberi tahun.
   ========================================================================= */
(function () {
  'use strict';

  // Warna: [terang, gelap] untuk gradasi radial
  const PLANETS = [
    {
      id: 'merkurius', nama: 'Merkurius', urut: 1, grup: 'dalam',
      tipe: 'Planet dalam · terestrial (berbatu)',
      sa: '0,39', jt: '57,9', diameter: '4.879', dNum: 4879,
      rev: '88 hari', rot: '58,6 hari', satelit: 'Tidak ada', cincin: 'Tidak',
      fakta: 'Planet terkecil dan terdekat dengan Matahari. Hampir tidak beratmosfer sehingga suhunya sangat ekstrem: siang sekitar 430 °C, malam sekitar −180 °C.',
      warna: ['#d9d4cc', '#7d756c'], r: 7
    },
    {
      id: 'venus', nama: 'Venus', urut: 2, grup: 'dalam',
      tipe: 'Planet dalam · terestrial (berbatu)',
      sa: '0,72', jt: '108,2', diameter: '12.104', dNum: 12104,
      rev: '224,7 hari', rot: '243 hari (retrograd)', satelit: 'Tidak ada', cincin: 'Tidak',
      fakta: 'Planet terpanas (sekitar 460 °C) karena atmosfer karbon dioksida yang tebal menimbulkan efek rumah kaca kuat. Berotasi retrograd (berlawanan arah dengan kebanyakan planet) dan sangat lambat. Dikenal sebagai “bintang fajar” atau “bintang senja”.',
      warna: ['#f7e2a8', '#c08a3e'], r: 11
    },
    {
      id: 'bumi', nama: 'Bumi', urut: 3, grup: 'dalam',
      tipe: 'Planet dalam · terestrial (berbatu)',
      sa: '1,00', jt: '149,6', diameter: '12.756', dNum: 12756,
      rev: '365,25 hari', rot: '23 jam 56 menit', satelit: '1 (Bulan)', cincin: 'Tidak',
      fakta: 'Satu-satunya planet yang diketahui memiliki kehidupan. Sekitar 71% permukaannya tertutup air. Sumbu rotasinya miring sekitar 23,5° sehingga terjadi pergantian musim.',
      warna: ['#7fc8ff', '#1d5fa8'], r: 11.5
    },
    {
      id: 'mars', nama: 'Mars', urut: 4, grup: 'dalam',
      tipe: 'Planet dalam · terestrial (berbatu)',
      sa: '1,52', jt: '228,0', diameter: '6.792', dNum: 6792,
      rev: '687 hari (± 1,9 tahun)', rot: '24 jam 37 menit', satelit: '2 (Phobos & Deimos)', cincin: 'Tidak',
      fakta: 'Disebut “planet merah” karena permukaannya mengandung banyak oksida besi (karat). Memiliki Olympus Mons, gunung berapi terbesar di tata surya.',
      warna: ['#ff9a6b', '#a53a1b'], r: 9
    },
    {
      id: 'jupiter', nama: 'Jupiter', urut: 5, grup: 'luar',
      tipe: 'Planet luar · raksasa gas',
      sa: '5,20', jt: '778,5', diameter: '142.984', dNum: 142984,
      rev: '± 11,9 tahun', rot: '9 jam 56 menit', satelit: 'Lebih dari 90 (data 2025)', cincin: 'Ya, tipis dan redup',
      fakta: 'Planet terbesar; diameternya sekitar 11 kali diameter Bumi. Rotasinya paling cepat di antara planet. Memiliki Bintik Merah Besar, badai raksasa yang lebih lebar daripada Bumi.',
      warna: ['#f3d2a4', '#a8714a'], r: 24, pita: true
    },
    {
      id: 'saturnus', nama: 'Saturnus', urut: 6, grup: 'luar',
      tipe: 'Planet luar · raksasa gas',
      sa: '9,57', jt: '1.432', diameter: '120.536', dNum: 120536,
      rev: '± 29,4 tahun', rot: '10 jam 33 menit', satelit: '274 — terbanyak (data 2025)', cincin: 'Ya, paling terang dan lebar',
      fakta: 'Terkenal dengan sistem cincinnya yang tersusun dari kepingan es dan batuan. Massa jenis rata-ratanya lebih kecil daripada air. Satelit terbesarnya, Titan, memiliki atmosfer tebal.',
      warna: ['#f6e3b0', '#b48d4f'], r: 20, cincinGambar: true
    },
    {
      id: 'uranus', nama: 'Uranus', urut: 7, grup: 'luar',
      tipe: 'Planet luar · raksasa es',
      sa: '19,2', jt: '2.867', diameter: '51.118', dNum: 51118,
      rev: '± 84 tahun', rot: '17 jam 14 menit (retrograd)', satelit: '29 (data 2025)', cincin: 'Ya, tipis dan gelap',
      fakta: 'Sumbu rotasinya miring sekitar 98°, sehingga Uranus seolah-olah “berguling” saat mengelilingi Matahari. Warna biru kehijauannya berasal dari gas metana.',
      warna: ['#c9f3f4', '#4fa9b8'], r: 15
    },
    {
      id: 'neptunus', nama: 'Neptunus', urut: 8, grup: 'luar',
      tipe: 'Planet luar · raksasa es',
      sa: '30,2', jt: '4.515', diameter: '49.528', dNum: 49528,
      rev: '± 165 tahun', rot: '16 jam 6 menit', satelit: '16 (data 2025)', cincin: 'Ya, tipis dan gelap',
      fakta: 'Planet terjauh dari Matahari. Anginnya tercepat di tata surya, lebih dari 2.000 km/jam. Ditemukan pada 1846 berdasarkan perhitungan matematika.',
      warna: ['#8fb6ff', '#2a47b8'], r: 14.5
    }
  ];

  const MATAHARI = {
    nama: 'Matahari', diameter: '± 1,39 juta km', dNum: 1392700,
    fakta: 'Matahari adalah bintang, pusat tata surya. Massanya sekitar 99,8% massa seluruh tata surya. Diameternya kira-kira 109 kali diameter Bumi. Cahaya Matahari memerlukan sekitar 8 menit 20 detik untuk sampai ke Bumi.'
  };

  const KERDIL = [
    { nama: 'Ceres', lokasi: 'Sabuk asteroid (antara Mars dan Jupiter)', diameter: 'diameter ± 940 km', catatan: 'Benda terbesar di sabuk asteroid.' },
    { nama: 'Pluto', lokasi: 'Sabuk Kuiper (± 39,5 SA)', diameter: 'diameter ± 2.377 km', catatan: 'Dahulu dianggap planet ke-9; sejak 2006 digolongkan planet kerdil. Memiliki 5 satelit, terbesar Charon. Revolusi ± 248 tahun.' },
    { nama: 'Haumea', lokasi: 'Sabuk Kuiper', diameter: 'lonjong, tidak bulat sempurna', catatan: 'Berotasi sangat cepat (± 4 jam sekali) sehingga bentuknya memanjang.' },
    { nama: 'Makemake', lokasi: 'Sabuk Kuiper', diameter: 'diameter ± 1.430 km', catatan: 'Ditemukan pada 2005.' },
    { nama: 'Eris', lokasi: 'Piringan tersebar di luar Sabuk Kuiper', diameter: 'diameter ± 2.326 km', catatan: 'Sedikit lebih kecil daripada Pluto, tetapi massanya lebih besar. Penemuannya memicu definisi planet IAU 2006.' }
  ];

  /* ---------------------------------------------------------------------
     KUIS FORMATIF — 20 soal pilihan ganda (level kognitif Bloom revisi)
     a = indeks jawaban benar (0..3)
     --------------------------------------------------------------------- */
  const KUIS = [
    { lv: 'C1', q: 'Urutan empat planet terdekat dengan Matahari yang benar adalah …',
      o: ['Merkurius – Venus – Bumi – Mars', 'Venus – Merkurius – Bumi – Mars', 'Merkurius – Bumi – Venus – Mars', 'Mars – Bumi – Venus – Merkurius'], a: 0,
      e: 'Dari yang terdekat: Merkurius, Venus, Bumi, Mars. Keempatnya disebut planet dalam.' },
    { lv: 'C1', q: 'Benda langit yang menjadi pusat tata surya kita adalah …',
      o: ['Bumi', 'Bulan', 'Matahari', 'Jupiter'], a: 2,
      e: 'Matahari adalah bintang pusat tata surya. Gravitasinya yang besar (± 99,8% massa tata surya) membuat planet dan benda lain beredar mengelilinginya.' },
    { lv: 'C2', q: 'Kelompok planet berikut yang seluruhnya termasuk planet luar adalah …',
      o: ['Mars, Jupiter, Saturnus, Uranus', 'Jupiter, Saturnus, Uranus, Neptunus', 'Venus, Bumi, Jupiter, Saturnus', 'Merkurius, Uranus, Neptunus, Mars'], a: 1,
      e: 'Planet luar berada di luar sabuk asteroid: Jupiter, Saturnus, Uranus, dan Neptunus. Mars masih termasuk planet dalam.' },
    { lv: 'C2', q: 'Batas yang memisahkan planet dalam dan planet luar adalah …',
      o: ['Sabuk Kuiper', 'Orbit Bulan', 'Sabuk asteroid', 'Awan Oort'], a: 2,
      e: 'Sabuk asteroid terletak di antara orbit Mars dan Jupiter, menjadi batas antara planet dalam dan planet luar.' },
    { lv: 'C1', q: 'Planet yang memiliki cincin adalah …',
      o: ['Hanya Saturnus', 'Saturnus dan Jupiter saja', 'Jupiter, Saturnus, Uranus, dan Neptunus', 'Semua planet di tata surya'], a: 2,
      e: 'Keempat planet luar memiliki cincin. Cincin Saturnus paling terang dan lebar sehingga paling mudah diamati; cincin planet luar lainnya tipis dan redup.' },
    { lv: 'C2', q: 'Dua planet yang berotasi retrograd (berlawanan arah dengan rotasi kebanyakan planet) adalah …',
      o: ['Merkurius dan Mars', 'Venus dan Uranus', 'Bumi dan Neptunus', 'Jupiter dan Saturnus'], a: 1,
      e: 'Venus dan Uranus berotasi retrograd. Rotasi Venus juga sangat lambat, yaitu sekitar 243 hari Bumi.' },
    { lv: 'C2', q: 'Sejak 2006, IAU menggolongkan Pluto sebagai planet kerdil. Alasan utamanya adalah Pluto …',
      o: ['tidak mengorbit Matahari', 'bentuknya tidak bulat', 'belum “membersihkan” lingkungan di sekitar orbitnya dari benda lain', 'terlalu jauh dari Matahari'], a: 2,
      e: 'Pluto mengorbit Matahari dan bentuknya hampir bulat, tetapi orbitnya berbagi wilayah dengan banyak benda di Sabuk Kuiper. Karena tidak memenuhi syarat ketiga definisi planet IAU, Pluto menjadi planet kerdil.' },
    { lv: 'C2', q: 'Jejak cahaya yang tampak di langit malam ketika batuan antariksa terbakar di atmosfer Bumi disebut …',
      o: ['meteoroid', 'meteor', 'meteorit', 'asteroid'], a: 1,
      e: 'Meteoroid = batuan kecil di antariksa. Meteor = jejak cahaya saat meteoroid terbakar di atmosfer (“bintang jatuh”). Meteorit = sisa yang sampai ke permukaan Bumi.' },
    { lv: 'C3', q: 'Ke mana arah ekor komet ketika komet mendekati Matahari?',
      o: ['Selalu ke arah Matahari', 'Selalu searah gerak komet', 'Selalu menjauhi Matahari', 'Berubah-ubah secara acak'], a: 2,
      e: 'Ekor komet terbentuk karena es menguap saat dekat Matahari, lalu didorong oleh angin surya dan tekanan radiasi. Akibatnya ekor selalu mengarah menjauhi Matahari, bahkan ketika komet bergerak menjauh.' },
    { lv: 'C2', q: 'Peristiwa berikut yang merupakan akibat rotasi Bumi adalah …',
      o: ['pergantian musim', 'terjadinya siang dan malam', 'gerak semu tahunan Matahari', 'perubahan rasi bintang yang tampak setiap bulan'], a: 1,
      e: 'Rotasi Bumi (± 24 jam) menyebabkan siang-malam, gerak semu harian Matahari, dan perbedaan waktu. Pergantian musim, gerak semu tahunan, dan perubahan rasi bintang adalah akibat revolusi.' },
    { lv: 'C3', q: 'Di Jakarta (WIB) pukul 08.00. Pada saat yang sama, pukul berapa di Jayapura (WIT)?',
      o: ['06.00', '09.00', '10.00', '07.00'], a: 2,
      e: 'WIT = UTC+9 dan WIB = UTC+7, selisih 2 jam. Wilayah timur lebih dahulu terkena sinar Matahari karena Bumi berotasi dari barat ke timur, sehingga Jayapura pukul 10.00.' },
    { lv: 'C4', q: 'Penyebab utama terjadinya pergantian musim di Bumi adalah …',
      o: ['jarak Bumi–Matahari yang berubah-ubah', 'kemiringan sumbu rotasi Bumi (± 23,5°) saat Bumi berevolusi', 'rotasi Bumi yang semakin lambat', 'perubahan ukuran Matahari'], a: 1,
      e: 'Kemiringan sumbu membuat belahan utara dan selatan bergantian lebih condong ke Matahari. Bukti bahwa jarak bukan penyebabnya: Bumi justru paling dekat dengan Matahari sekitar awal Januari, saat belahan Bumi utara mengalami musim dingin.' },
    { lv: 'C3', q: 'Pada sekitar tanggal 21 Juni, Matahari tampak tepat berada di atas …',
      o: ['garis khatulistiwa (0°)', 'garis balik selatan (23,5° LS)', 'garis balik utara (23,5° LU)', 'kutub utara (90° LU)'], a: 2,
      e: 'Akibat gerak semu tahunan, sekitar 21 Juni Matahari berada di atas garis balik utara (23,5° LU), dan sekitar 22 Desember di atas garis balik selatan. Sekitar 21 Maret dan 23 September Matahari berada di atas khatulistiwa.' },
    { lv: 'C2', q: 'Fase Bulan yang terjadi tepat setelah fase Bulan baru adalah …',
      o: ['Bulan purnama', 'Bulan sabit awal', 'Bulan cembung akhir', 'Kuartal ketiga'], a: 1,
      e: 'Urutannya: Bulan baru → sabit awal → kuartal pertama → cembung awal → purnama → cembung akhir → kuartal ketiga → sabit akhir → kembali Bulan baru (± 29,5 hari).' },
    { lv: 'C3', q: 'Gerhana Bulan terjadi apabila …',
      o: ['Bulan berada di antara Matahari dan Bumi pada fase Bulan baru', 'Bumi berada di antara Matahari dan Bulan pada fase purnama', 'Matahari berada di antara Bumi dan Bulan', 'Bulan berada di titik terjauhnya dari Bumi'], a: 1,
      e: 'Pada gerhana Bulan, posisi Matahari–Bumi–Bulan segaris sehingga Bulan memasuki bayangan Bumi. Ini hanya mungkin terjadi pada fase purnama.' },
    { lv: 'C4', q: 'Mengapa gerhana Matahari tidak terjadi pada setiap fase Bulan baru?',
      o: ['Karena Bulan tidak memantulkan cahaya pada fase Bulan baru', 'Karena bidang orbit Bulan miring sekitar 5° terhadap bidang orbit Bumi', 'Karena Bumi berotasi terlalu cepat', 'Karena ukuran Bulan berubah setiap bulan'], a: 1,
      e: 'Akibat kemiringan ± 5°, pada sebagian besar Bulan baru bayangan Bulan lewat di atas atau di bawah Bumi. Gerhana hanya terjadi bila Bulan baru (atau purnama) terjadi di dekat titik potong kedua bidang orbit.' },
    { lv: 'C4', q: 'Pada suatu gerhana Matahari, bayangan inti (umbra) Bulan tidak sampai ke permukaan Bumi sehingga Matahari tampak seperti cincin bercahaya. Hal ini terjadi karena …',
      o: ['Bulan berada pada posisi terjauh dari Bumi sehingga piringannya tampak lebih kecil daripada Matahari', 'Bulan berada pada posisi terdekat dari Bumi', 'Bumi berada di antara Matahari dan Bulan', 'Matahari sedang mengecil'], a: 0,
      e: 'Itulah gerhana Matahari cincin. Saat Bulan jauh dari Bumi, ukuran tampaknya sedikit lebih kecil daripada Matahari, sehingga tepi Matahari tetap terlihat sebagai cincin.' },
    { lv: 'C4', q: 'Perhatikan data periode revolusi: Merkurius 88 hari, Bumi 365 hari, Mars 687 hari, Jupiter ± 11,9 tahun, Neptunus ± 165 tahun. Kesimpulan yang paling tepat adalah …',
      o: ['Semakin besar planet, semakin cepat revolusinya', 'Semakin jauh planet dari Matahari, semakin lama periode revolusinya', 'Periode revolusi semua planet sama', 'Planet luar berevolusi lebih cepat daripada planet dalam'], a: 1,
      e: 'Data menunjukkan pola: makin jauh dari Matahari, lintasan orbit makin panjang dan gerak planet makin lambat, sehingga periode revolusinya makin lama.' },
    { lv: 'C5', q: 'Seorang siswa berpendapat, “Bulan bersinar sendiri seperti Matahari.” Penilaian yang paling tepat terhadap pendapat tersebut adalah …',
      o: ['Benar, karena Bulan tampak terang di malam hari', 'Benar, karena Bulan adalah bintang kecil', 'Tidak tepat, karena Bulan memantulkan cahaya Matahari; buktinya bentuk Bulan yang terlihat berubah-ubah (fase)', 'Tidak tepat, karena Bulan hanya terlihat pada siang hari'], a: 2,
      e: 'Bulan tidak menghasilkan cahaya sendiri. Fase Bulan terjadi karena bagian Bulan yang tersinari Matahari terlihat dari Bumi dengan luas yang berbeda-beda sesuai posisinya.' },
    { lv: 'C5', q: 'Andaikan sumbu rotasi Bumi tegak lurus terhadap bidang orbitnya (tidak miring). Prediksi yang paling masuk akal adalah …',
      o: ['Tidak ada lagi siang dan malam', 'Tidak terjadi pergantian musim yang jelas, dan panjang siang–malam hampir sama sepanjang tahun', 'Satu tahun menjadi lebih pendek', 'Bumi tidak lagi mengelilingi Matahari'], a: 1,
      e: 'Siang-malam tetap terjadi karena Bumi tetap berotasi. Namun tanpa kemiringan sumbu, sudut datang sinar Matahari di tiap tempat hampir tidak berubah sepanjang tahun, sehingga musim tidak berganti dengan jelas.' }
  ];

  /* ---------------------------------------------------------------------
     GAME "TEBAK BENDA LANGIT": 4 petunjuk dari umum ke khusus
     --------------------------------------------------------------------- */
  const TEBAK = [
    { id: 'merkurius', p: ['Aku tidak memiliki satelit alami.', 'Aku hampir tidak beratmosfer, sehingga suhu siang dan malamku sangat ekstrem.', 'Satu kali revolusiku hanya 88 hari Bumi.', 'Aku planet terkecil dan terdekat dengan Matahari.'] },
    { id: 'venus', p: ['Aku planet dalam yang berbatu.', 'Aku berotasi retrograd dan sangat lambat: satu rotasiku ± 243 hari Bumi.', 'Atmosfer karbon dioksidaku sangat tebal sehingga aku planet terpanas.', 'Aku sering disebut “bintang fajar” atau “bintang senja”.'] },
    { id: 'bumi', p: ['Aku planet dalam yang berbatu.', 'Aku memiliki satu satelit alami.', 'Sumbuku miring ± 23,5° sehingga terjadi pergantian musim.', 'Sekitar 71% permukaanku tertutup air, dan aku satu-satunya planet yang diketahui memiliki kehidupan.'] },
    { id: 'mars', p: ['Aku planet dalam yang berbatu.', 'Satu hariku sekitar 24 jam 37 menit, mirip dengan Bumi.', 'Aku memiliki dua satelit kecil, Phobos dan Deimos.', 'Permukaanku kaya oksida besi sehingga aku dijuluki “planet merah”.'] },
    { id: 'jupiter', p: ['Aku planet raksasa gas yang bercincin tipis.', 'Aku berotasi paling cepat: satu hariku kurang dari 10 jam.', 'Aku memiliki badai raksasa bernama Bintik Merah Besar.', 'Aku planet terbesar di tata surya.'] },
    { id: 'saturnus', p: ['Aku planet raksasa gas.', 'Massa jenis rata-rataku lebih kecil daripada air.', 'Satelit terbesarku, Titan, memiliki atmosfer tebal.', 'Cincinku paling terang dan paling mudah diamati.'] },
    { id: 'uranus', p: ['Aku planet raksasa es berwarna biru kehijauan.', 'Aku berotasi retrograd.', 'Sumbu rotasiku miring ± 98°, seolah aku berguling mengelilingi Matahari.', 'Aku planet ketujuh dari Matahari.'] },
    { id: 'neptunus', p: ['Aku planet raksasa es berwarna biru tua.', 'Anginku tercepat di tata surya, lebih dari 2.000 km/jam.', 'Satu kali revolusiku ± 165 tahun Bumi.', 'Aku planet terjauh dari Matahari.'] },
    { id: 'pluto', p: ['Aku berada di Sabuk Kuiper.', 'Satelit terbesarku bernama Charon.', 'Satu kali revolusiku ± 248 tahun Bumi.', 'Sejak 2006, IAU menggolongkanku sebagai planet kerdil.'] }
  ];

  const GLOSARIUM = [
    ['Antumbra', 'Daerah di belakang ujung bayangan inti; pengamat di sini melihat gerhana Matahari cincin.'],
    ['Aphelion', 'Titik pada orbit planet yang paling jauh dari Matahari (Bumi: sekitar awal Juli).'],
    ['Asteroid', 'Benda berbatu atau logam berukuran kecil hingga ratusan kilometer yang mengorbit Matahari, sebagian besar di sabuk asteroid.'],
    ['Bulan (satelit)', 'Satelit alami Bumi; tidak memancarkan cahaya sendiri, melainkan memantulkan cahaya Matahari.'],
    ['Ekliptika', 'Bidang orbit Bumi mengelilingi Matahari; dari Bumi tampak sebagai lintasan semu tahunan Matahari di langit.'],
    ['Ekuinoks', 'Saat Matahari tepat di atas khatulistiwa (sekitar 21 Maret dan 23 September); lama siang dan malam hampir sama di seluruh Bumi.'],
    ['Fase Bulan', 'Perubahan bentuk bagian Bulan yang tersinari Matahari dan terlihat dari Bumi; satu siklus ± 29,5 hari.'],
    ['Gerak semu', 'Gerak benda langit yang tampak dari Bumi, padahal disebabkan oleh gerak Bumi sendiri (rotasi atau revolusi).'],
    ['Gerhana', 'Peristiwa tertutupnya cahaya suatu benda langit oleh benda langit lain, karena Matahari, Bumi, dan Bulan berada pada satu garis.'],
    ['Komet', 'Benda kecil dari es, debu, dan batuan dengan orbit sangat lonjong; saat dekat Matahari membentuk koma dan ekor yang menjauhi Matahari.'],
    ['Meteoroid', 'Pecahan batuan atau logam kecil yang bergerak di antariksa.'],
    ['Meteor', 'Jejak cahaya ketika meteoroid memasuki atmosfer Bumi dan terbakar karena gesekan (“bintang jatuh”).'],
    ['Meteorit', 'Sisa meteoroid yang tidak habis terbakar dan jatuh sampai ke permukaan Bumi.'],
    ['Orbit', 'Lintasan sebuah benda ketika mengelilingi benda lain, misalnya lintasan planet mengelilingi Matahari.'],
    ['Penumbra', 'Bayangan kabur (bayangan sebagian) yang mengelilingi umbra.'],
    ['Perihelion', 'Titik pada orbit planet yang paling dekat dengan Matahari (Bumi: sekitar awal Januari).'],
    ['Planet', 'Menurut IAU (2006): benda langit yang mengorbit Matahari, massanya cukup sehingga bentuknya hampir bulat, dan telah membersihkan lingkungan di sekitar orbitnya.'],
    ['Planet dalam', 'Planet yang orbitnya berada di antara Matahari dan sabuk asteroid: Merkurius, Venus, Bumi, Mars.'],
    ['Planet kerdil', 'Benda yang mengorbit Matahari dan hampir bulat, tetapi belum membersihkan lingkungan orbitnya dan bukan satelit; contoh Pluto, Ceres, Eris.'],
    ['Planet luar', 'Planet yang orbitnya berada di luar sabuk asteroid: Jupiter, Saturnus, Uranus, Neptunus.'],
    ['Revolusi', 'Gerak suatu benda langit mengelilingi benda langit lain; revolusi Bumi mengelilingi Matahari ± 365,25 hari.'],
    ['Rotasi', 'Perputaran benda langit pada sumbunya; rotasi Bumi dari barat ke timur ± 24 jam.'],
    ['Rotasi retrograd', 'Rotasi yang arahnya berlawanan dengan arah rotasi kebanyakan planet (contoh: Venus dan Uranus).'],
    ['Sabuk asteroid', 'Wilayah di antara orbit Mars dan Jupiter tempat sebagian besar asteroid beredar.'],
    ['Sabuk Kuiper', 'Wilayah berbentuk piringan di luar orbit Neptunus yang berisi banyak benda es, termasuk Pluto.'],
    ['Satelit', 'Benda langit yang mengorbit planet; satelit alami Bumi adalah Bulan.'],
    ['Satuan Astronomi (SA)', 'Satuan jarak sebesar jarak rata-rata Bumi–Matahari, ± 149,6 juta km.'],
    ['Solstis (titik balik)', 'Saat Matahari berada paling utara (± 21 Juni, 23,5° LU) atau paling selatan (± 22 Desember, 23,5° LS).'],
    ['Tata surya', 'Susunan Matahari sebagai pusat beserta semua benda langit yang terikat gravitasinya: planet, planet kerdil, satelit, asteroid, komet, dan meteoroid.'],
    ['Umbra', 'Bayangan inti yang gelap; pengamat di wilayah umbra mengalami gerhana total.']
  ];

  window.MODUL_DATA = { PLANETS, MATAHARI, KERDIL, KUIS, TEBAK, GLOSARIUM };
})();

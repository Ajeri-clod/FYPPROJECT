/**
 * Creates the Google Form "Borang Penilaian Dashboard OKU" in your Google Drive.
 *
 * How to use:
 *   1. Go to https://script.google.com and click "New project".
 *   2. Delete the sample code, paste this whole file, and click Save.
 *   3. Choose the function "createQuestionnaireForm" and click Run.
 *   4. Allow the permissions Google asks for (it needs to create a form for you).
 *   5. Open "Execution log": it shows the link to share and the link to edit.
 *      The form is also in your Google Drive.
 *
 * Running it again creates a second copy, so run it once.
 */
function createQuestionnaireForm() {
  var SCALE = ["1", "2", "3", "4", "5"];
  var AGREE =
    "Skala: 1 = Sangat tidak setuju, 2 = Tidak setuju, 3 = Neutral, 4 = Setuju, 5 = Sangat setuju";

  var form = FormApp.create("Borang Penilaian Dashboard OKU");
  form
    .setTitle(
      "Borang Soal Selidik Penilaian Dashboard Analitik Data OKU bagi Peluang Pekerjaan di Selangor"
    )
    .setDescription(
      "Evaluation Questionnaire: OKU Data Analytics Dashboard for Job Opportunities in Selangor\n\n" +
        "Penyelidik: Muhammad Azry Haqimi bin Khezri Kamil (2025118351)\n" +
        "Program: Sarjana Muda Sistem Maklumat (Kepujian) Kejuruteraan Sistem Pintar, Fakulti Sains Komputer dan Matematik, UiTM\n" +
        "Penyelia: Dr. Azlin binti Ahmad\n" +
        "Anggaran masa menjawab: 15–20 minit\n\n" +
        "Tujuan: Soal selidik ini menilai kebolehgunaan, kefungsian dan kebergunaan dashboard yang membantu memadankan OKU dengan peluang pekerjaan di Selangor, serta kerelevanan cadangan pekerjaan yang dihasilkan oleh model Content-Based Filtering (TF-IDF dan Cosine Similarity).\n\n" +
        "Kerahsiaan: Penyertaan adalah secara sukarela. Tiada nama, nombor kad pengenalan atau maklumat peribadi dikumpul. Jawapan digunakan untuk tujuan akademik sahaja dan dilaporkan secara agregat.\n\n" +
        "Cara menjawab: Sila gunakan dashboard (pautan diberi oleh penyelidik) sebelum menjawab Bahagian B hingga F."
    )
    .setCollectEmail(false)
    .setProgressBar(true)
    .setConfirmationMessage(
      "Terima kasih atas penyertaan anda. Maklum balas ini akan digunakan untuk menambah baik prototaip dashboard."
    );

  // ---------------------------------------------------------------- A
  form
    .addSectionHeaderItem()
    .setTitle("Bahagian A: Persetujuan dan Latar Belakang Responden")
    .setHelpText("Section A: Consent and respondent background");

  var consent = form.addMultipleChoiceItem();
  consent
    .setTitle("A1. Saya telah membaca maklumat di atas dan bersetuju untuk menyertai kajian ini.")
    .setChoices([
      consent.createChoice("Ya, saya bersetuju", FormApp.PageNavigationType.CONTINUE),
      consent.createChoice("Tidak", FormApp.PageNavigationType.SUBMIT),
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("A2. Kategori responden")
    .setChoiceValues([
      "OKU / pencari kerja OKU",
      "Majikan / wakil sumber manusia",
      "Pegawai agensi (JKM, PERKESO, UPEN atau lain-lain)",
      "Ahli akademik / pakar",
    ])
    .showOtherOption(true)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("A3. Jika anda OKU, kategori ketidakupayaan (pilihan, boleh dilangkau)")
    .setChoiceValues([
      "Fizikal",
      "Penglihatan",
      "Pendengaran",
      "Pertuturan",
      "Pembelajaran",
      "Mental",
      "Pelbagai",
      "Tidak mahu menyatakan",
    ]);

  form
    .addMultipleChoiceItem()
    .setTitle("A4. Umur")
    .setChoiceValues(["18–24", "25–34", "35–44", "45–54", "55 ke atas"])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("A5. Pengalaman dalam bidang pekerjaan OKU, kebajikan atau sumber manusia")
    .setChoiceValues(["Tiada", "Kurang 1 tahun", "1–5 tahun", "6–10 tahun", "Lebih 10 tahun"])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("A6. Berapa kerap anda menggunakan dashboard atau aplikasi analitik data?")
    .setChoiceValues(["Tidak pernah", "Jarang", "Kadang-kadang", "Kerap", "Setiap hari"])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle("A7. Peranti yang digunakan untuk menilai dashboard")
    .setChoiceValues(["Komputer / komputer riba", "Tablet", "Telefon pintar"])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle("A8. Teknologi bantuan yang digunakan (jika ada)")
    .setChoiceValues(["Tiada", "Pembaca skrin", "Pembesar skrin / zum"])
    .showOtherOption(true);

  // ---------------------------------------------------------------- B
  form
    .addPageBreakItem()
    .setTitle("Bahagian B: Kebolehgunaan Sistem (System Usability Scale, SUS)")
    .setHelpText("Section B: System Usability Scale (Brooke, 1996), Malay translation.\n" + AGREE);

  form
    .addGridItem()
    .setTitle("Nilai setiap pernyataan berikut")
    .setRows([
      "B1. Saya rasa saya akan kerap menggunakan dashboard ini.",
      "B2. Saya dapati dashboard ini terlalu rumit tanpa sebab.",
      "B3. Saya rasa dashboard ini mudah digunakan.",
      "B4. Saya rasa saya memerlukan bantuan orang teknikal untuk menggunakan dashboard ini.",
      "B5. Saya dapati pelbagai fungsi dalam dashboard ini disepadukan dengan baik.",
      "B6. Saya rasa terdapat terlalu banyak ketidakkonsistenan dalam dashboard ini.",
      "B7. Saya rasa kebanyakan orang akan dapat belajar menggunakan dashboard ini dengan cepat.",
      "B8. Saya dapati dashboard ini sangat menyusahkan untuk digunakan.",
      "B9. Saya berasa sangat yakin semasa menggunakan dashboard ini.",
      "B10. Saya perlu mempelajari banyak perkara sebelum boleh menggunakan dashboard ini.",
    ])
    .setColumns(SCALE)
    .setRequired(true);

  // ---------------------------------------------------------------- C
  form
    .addPageBreakItem()
    .setTitle("Bahagian C: Kefungsian dan Kebergunaan Modul Dashboard")
    .setHelpText("Section C: Functionality and usefulness of each dashboard module.\n" + AGREE);

  var modules = [
    [
      "Profil OKU",
      [
        "C1. Visualisasi profil OKU membantu saya memahami taburan OKU mengikut kategori ketidakupayaan, umur dan jantina.",
        "C2. Penapis daerah memudahkan saya membandingkan profil OKU antara daerah di Selangor.",
      ],
    ],
    [
      "Statistik Pekerjaan dan Penempatan Pekerjaan OKU",
      [
        "C3. Dashboard menunjukkan kadar pekerjaan OKU dengan jelas berbanding penduduk umum di setiap daerah.",
        "C4. Statistik penempatan pekerjaan (sektor, jenis pekerjaan, julat gaji) membantu saya mengenal pasti bidang yang menggaji OKU.",
      ],
    ],
    [
      "Wawasan Pasaran Buruh",
      [
        "C5. Dashboard menunjukkan kemahiran, industri dan lokasi yang paling banyak diperlukan oleh majikan di Selangor.",
        "C6. Maklumat kemudahan tempat kerja mesra OKU (contoh: akses kerusi roda, pembaca skrin) berguna kepada saya.",
      ],
    ],
    [
      "Cadangan Pekerjaan",
      [
        "C7. Pekerjaan yang dicadangkan sepadan dengan kemahiran calon.",
        "C8. Skor padanan dan senarai kemahiran yang dimiliki / tiada membantu saya memahami sebab sesuatu pekerjaan dicadangkan.",
      ],
    ],
    [
      "Analitik Jurang Kemahiran",
      [
        "C9. Analisis jurang kemahiran membantu mengenal pasti kemahiran yang perlu dilatih kepada OKU.",
        "C10. Cadangan latihan bagi setiap calon adalah munasabah dan boleh dilaksanakan.",
      ],
    ],
    [
      "Keseluruhan",
      [
        "C11. Carta dan visualisasi dalam dashboard mudah difahami.",
        "C12. Dashboard ini boleh membantu pihak berkepentingan membuat keputusan berkaitan pekerjaan OKU di Selangor.",
        "C13. Dashboard ini menyokong matlamat Dasar OKU Negeri Selangor 2025–2030.",
      ],
    ],
  ];
  modules.forEach(function (m) {
    form.addGridItem().setTitle(m[0]).setRows(m[1]).setColumns(SCALE).setRequired(true);
  });

  // Only the expert panel answers Section D; everyone else skips to E.
  var isExpert = form.addMultipleChoiceItem();
  isExpert
    .setTitle("Adakah anda dijemput sebagai panel pakar untuk menilai cadangan pekerjaan (Bahagian D)?")
    .setRequired(true);

  // ---------------------------------------------------------------- D
  form
    .addPageBreakItem()
    .setTitle("Bahagian D: Penilaian Pakar terhadap Cadangan Pekerjaan")
    .setHelpText(
      "Section D: Expert review of job recommendations (expert panel only).\n" +
        "Bagi setiap profil calon, buka modul Cadangan Pekerjaan dan nilai kerelevanan lima pekerjaan teratas yang dicadangkan. Keputusan ini digunakan untuk mengira Precision@5 model.\n" +
        "Skala: 1 = Tidak relevan, 2 = Kurang relevan, 3 = Agak relevan, 4 = Relevan, 5 = Sangat relevan.\n" +
        "Nota: Profil calon dalam versi semasa ialah profil contoh (sintetik)."
    );

  var jobs = ["Pekerjaan #1", "Pekerjaan #2", "Pekerjaan #3", "Pekerjaan #4", "Pekerjaan #5"];
  [
    "D1. Profil C-0001: Diploma Pengurusan Pejabat; Microsoft Office, kemasukan data, menaip, simpan rekod",
    "D2. Profil C-0004: Ijazah Pentadbiran Perniagaan; khidmat pelanggan, komunikasi, perisian CRM, pembaca skrin",
    "D3. Profil C-0006: SKM Tahap 1 Penyediaan Makanan; penyediaan makanan, kebersihan, kerja berpasukan",
  ].forEach(function (title) {
    form.addGridItem().setTitle(title).setRows(jobs).setColumns(SCALE).setRequired(true);
  });

  form
    .addParagraphTextItem()
    .setTitle(
      "D4. Adakah terdapat pekerjaan yang sepatutnya dicadangkan tetapi tidak muncul dalam lima teratas? Nyatakan."
    );

  form
    .addMultipleChoiceItem()
    .setTitle("D5. Adakah skor padanan (%) mencerminkan tahap kesesuaian sebenar antara calon dan pekerjaan?")
    .setChoiceValues(["Ya", "Sebahagiannya", "Tidak"])
    .setRequired(true);

  // ---------------------------------------------------------------- E
  var pageE = form
    .addPageBreakItem()
    .setTitle("Bahagian E: Keadilan dan Kebolehcapaian")
    .setHelpText("Section E: Fairness and accessibility.\n" + AGREE);

  form
    .addGridItem()
    .setTitle("Nilai setiap pernyataan berikut")
    .setRows([
      "E1. Cadangan pekerjaan adalah adil kerana ia berdasarkan kemahiran, pendidikan dan pengalaman, bukan kategori ketidakupayaan, jantina, etnik atau umur.",
      "E2. Dashboard ini menggalakkan peluang pekerjaan yang lebih inklusif untuk OKU.",
      "E3. Teks, warna dan kontras dalam dashboard mudah dibaca.",
      "E4. Dashboard boleh digunakan dengan baik pada telefon pintar atau tablet.",
      "E6. Saya yakin data peribadi OKU dilindungi kerana dashboard hanya memaparkan statistik agregat.",
    ])
    .setColumns(SCALE)
    .setRequired(true);

  form
    .addScaleItem()
    .setTitle(
      "E5. Dashboard boleh digunakan bersama teknologi bantuan (contoh: pembaca skrin). Jawab hanya jika anda menggunakannya."
    )
    .setBounds(1, 5)
    .setLabels("Sangat tidak setuju", "Sangat setuju");

  // ---------------------------------------------------------------- F
  form
    .addPageBreakItem()
    .setTitle("Bahagian F: Ulasan dan Cadangan")
    .setHelpText("Section F: Comments and suggestions");

  form.addParagraphTextItem().setTitle("F1. Apakah ciri dashboard yang paling berguna kepada anda? Mengapa?");
  form
    .addParagraphTextItem()
    .setTitle("F2. Apakah masalah atau kesukaran yang anda hadapi semasa menggunakan dashboard?");
  form.addParagraphTextItem().setTitle("F3. Apakah maklumat atau fungsi tambahan yang patut dimasukkan?");
  form
    .addMultipleChoiceItem()
    .setTitle("F4. Secara keseluruhan, adakah anda akan mengesyorkan dashboard ini kepada agensi atau majikan?")
    .setChoiceValues(["Ya", "Mungkin", "Tidak"])
    .setRequired(true);

  // Branching for the expert question (needs Section E to exist first).
  isExpert.setChoices([
    isExpert.createChoice("Ya", FormApp.PageNavigationType.CONTINUE),
    isExpert.createChoice("Tidak", pageE),
  ]);

  Logger.log("Share this link with respondents: " + form.getPublishedUrl());
  Logger.log("Edit the form here: " + form.getEditUrl());
}

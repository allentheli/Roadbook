/* ===================== Regimen library ===================== */
const MODS = {
  chemo:     { label:'Chemotherapy',                 color:'#3457D5' },
  io:        { label:'Immunotherapy',                color:'#0E9F8E' },
  targeted:  { label:'Targeted therapy',             color:'#7A4FD6' },
  endocrine: { label:'Hormone (endocrine) therapy',  color:'#C48A16' },
  radiation: { label:'Radiation',                    color:'#E0603C' },
  surgery:   { label:'Surgery',                      color:'#172033' },
  watch:     { label:'Surveillance',                 color:'#4C9A5B' },
};

// small constructors keep the library readable
const P = (o) => Object.assign({ t:'phase', mods:['chemo'], mode:'cycles', cycleDays:21, cycles:4, on:true }, o);
const R = (name, weeks, plain) => ({ t:'rest', name, weeks, plain });
const S = (name, plain) => ({ t:'event', name, mods:['surgery'], plain });
const D = (o) => Object.assign({ t:'decision', emph:null, only:false }, o);
const Br = (cond, nodes, short) => short ? ({ cond, nodes, short }) : ({ cond, nodes });

// reusable pieces
const RADIATION_ALONGSIDE = () => P({ name:'Radiation (if recommended)', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:'', optional:true, on:true, concurrent:true, brief:true,
  plain:'Daily radiation, Monday to Friday. Your radiation oncologist sets the number of sessions. Many people need this after surgery; your team will confirm.' });
const RADIATION_AFTER = (on=true) => P({ name:'Radiation (if recommended)', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:'', optional:true, on,
  plain:'Daily radiation, Monday to Friday, starting a few weeks after the previous step ends. Your radiation oncologist sets the number of sessions.' });
const ENDOCRINE_ALONGSIDE = () => P({ name:'Hormone (endocrine) therapy, if hormone-receptor positive', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260, optional:true, on:false, concurrent:true,
  plain:'If the cancer is hormone-receptor positive: one tablet a day (such as tamoxifen, letrozole, or anastrozole) for 5 to 10 years, starting around this same time.' });
// afterTreatment: true when chemotherapy or other treatment came before surgery, so the pathology report measures response.
const SURGERY_BREAST = (afterTreatment=false) => S('Surgery', afterTreatment
  ? 'Lumpectomy or mastectomy, with lymph node surgery. The removed tissue is examined under the microscope to see how well the treatment worked.'
  : 'Lumpectomy or mastectomy, with lymph node surgery. The removed tissue is examined under the microscope to confirm the stage and the cancer\'s features, which guide the next steps.');
const HEAL = (weeks=4) => R('Healing after surgery', weeks, 'Time to recover from surgery before treatment restarts.');
const RECOVER = (weeks=4) => R('Recovery before surgery', weeks, 'A break for your body to recover and for the surgical team to plan. Imaging is often repeated now.');

const LIBRARY = [

/* ---------------- BREAST ---------------- */
{
  id:'kn522', plan:'Chemo-immunotherapy around surgery', group:'Triple-negative', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Schmid P et al. Pembrolizumab for early triple-negative breast cancer. NEJM 2020 (KEYNOTE-522)',q:'KEYNOTE-522 Schmid pembrolizumab early triple-negative NEJM 2020'},{t:'Schmid P et al. Overall survival with pembrolizumab in early-stage TNBC. NEJM 2024',q:'KEYNOTE-522 overall survival Schmid NEJM 2024'},{t:'Masuda N et al. CREATE-X: adjuvant capecitabine for HER2-negative residual disease after neoadjuvant chemotherapy. NEJM 2017',q:'CREATE-X adjuvant capecitabine residual disease neoadjuvant Masuda NEJM 2017'}], disease:'breast', name:'KEYNOTE-522: chemo + pembrolizumab, surgery, pembrolizumab (+ capecitabine per CREATE-X if cancer remains)',
  trial:'KEYNOTE-522 and CREATE-X trials', summary:'Triple-negative, stage II–III. Neoadjuvant chemo-immunotherapy, surgery, adjuvant pembrolizumab; capecitabine added for residual disease (CREATE-X).',
  title:'Chemotherapy with immunotherapy before surgery, then immunotherapy after',
  subtitle:'Triple-negative breast cancer, stage II to III',
  nodes:[
    P({ name:'Paclitaxel + carboplatin + pembrolizumab (Keytruda)', short:'Carbo + paclitaxel + immunotherapy', mods:['chemo','io'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Paclitaxel, carboplatin, and pembrolizumab'},{d:8,label:'Paclitaxel and carboplatin'},{d:15,label:'Paclitaxel and carboplatin'}],
        plain:'Paclitaxel weekly plus carboplatin (weekly or once per 3-week cycle), plus pembrolizumab every 3 weeks. Pembrolizumab is immunotherapy: it helps your own immune system recognize and attack cancer cells.' }),
    P({ name:'Doxorubicin (or epirubicin) + cyclophosphamide + pembrolizumab', short:'AC + immunotherapy', mods:['chemo','io'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Doxorubicin, cyclophosphamide, and pembrolizumab'}],
        plain:'Two different chemotherapy drugs every 3 weeks, with pembrolizumab continuing. A growth-factor injection after each dose helps your blood counts recover.' }),
    RECOVER(4),
    SURGERY_BREAST(true),
    HEAL(5),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'The report tells us whether any cancer remained in the tissue removed at surgery. Immunotherapy continues either way; if cancer remained, an oral chemotherapy may be added.',
        branches:[
          Br('No remaining cancer (complete response)', [
            P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:9, plain:'Immunotherapy on its own, every 3 weeks, for 9 more doses. Each visit is short.' }),
            RADIATION_ALONGSIDE(),
          ]),
          Br('Some cancer remained', [
            P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:9, plain:'Immunotherapy on its own, every 3 weeks, for 9 more doses.' }),
            RADIATION_ALONGSIDE(),
            P({ name:'Capecitabine (oral chemotherapy)', short:'Capecitabine tablets', mods:['chemo'], cycleDays:21, cycles:8, optional:true, on:true, concurrent:true, afterPrev:true,
                visits:[{d:1,label:'Start 14 days of capecitabine tablets, then 7 days off'}],
                plain:'Chemotherapy tablets taken at home for 2 weeks out of every 3, for about 6 months, starting once radiation has finished. Giving them after radiation is common practice rather than a rule from the trial; your team sets the exact order. Immunotherapy continues at the same time. If you carry a BRCA gene change, olaparib tablets for 1 year may be recommended instead.' }),
          ]),
        ] }),
  ]
},
{
  id:'db11', plan:'HER2-targeted therapy around surgery', group:'HER2-positive', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Harbeck N et al. Neoadjuvant trastuzumab deruxtecan alone or followed by paclitaxel, trastuzumab, and pertuzumab for high-risk HER2-positive early breast cancer (DESTINY-Breast11). Annals of Oncology 2026;37:166-179',q:'DESTINY-Breast11 Harbeck neoadjuvant trastuzumab deruxtecan paclitaxel trastuzumab pertuzumab Annals of Oncology'},{t:'Geyer CE et al. DESTINY-Breast05: T-DXd vs T-DM1 for residual disease. NEJM 2026',q:'DESTINY-Breast05 trastuzumab deruxtecan residual invasive disease'}], disease:'breast', name:'DESTINY-Breast11: T-DXd then THP, surgery, HER2 therapy',
  trial:'DESTINY-Breast11', summary:'HER2-positive, high-risk stage II–III. T-DXd ×4, THP ×4, surgery, adjuvant HER2 therapy by response.',
  title:'HER2-targeted treatment before surgery, then continued after',
  subtitle:'HER2-positive breast cancer, stage II to III',
  nodes:[
    P({ name:'Trastuzumab deruxtecan (Enhertu)', short:'Enhertu (T-DXd)', mods:['targeted'], cycleDays:21, cycles:4,
        plain:'An antibody that locks onto the HER2 protein on cancer cells and delivers chemotherapy directly inside them. Given by IV every 3 weeks, 4 times.' }),
    P({ name:'Paclitaxel + trastuzumab + pertuzumab (THP)', short:'Paclitaxel + HER2 antibodies', mods:['chemo','targeted'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Paclitaxel, trastuzumab, and pertuzumab'},{d:8,label:'Paclitaxel'},{d:15,label:'Paclitaxel'}],
        plain:'Weekly chemotherapy (paclitaxel) plus two HER2-targeted antibodies every 3 weeks.' }),
    RECOVER(4),
    SURGERY_BREAST(true),
    HEAL(4),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'The report tells us whether any cancer remained. HER2-targeted treatment continues either way, to complete about one year in total.',
        branches:[
          Br('No remaining cancer (complete response)', [
            P({ name:'Trastuzumab + pertuzumab', short:'HER2 antibodies (HP)', mods:['targeted'], cycleDays:21, cycles:9, plain:'The two HER2 antibodies continue every 3 weeks, without chemotherapy, to complete about one year of HER2-targeted treatment counting the treatment given before surgery. Often given as an injection under the skin.' }),
            RADIATION_ALONGSIDE(),
            ENDOCRINE_ALONGSIDE(),
          ]),
          Br('Some cancer remained', [
            P({ name:'Trastuzumab deruxtecan (Enhertu)', short:'Enhertu (T-DXd)', mods:['targeted'], cycleDays:21, cycles:14, plain:'Trastuzumab deruxtecan every 3 weeks for up to 14 doses (DESTINY-Breast05). Trastuzumab emtansine (Kadcyla) for 14 doses is an alternative.' }),
            RADIATION_ALONGSIDE(),
            ENDOCRINE_ALONGSIDE(),
          ]),
        ] }),
  ]
},
{
  id:'tchp', plan:'Chemo with HER2 antibodies around surgery', group:'HER2-positive', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Schneeweiss A et al. TRYPHAENA. Annals of Oncology 2013',q:'TRYPHAENA pertuzumab trastuzumab docetaxel carboplatin neoadjuvant'},{t:'von Minckwitz G et al. KATHERINE: T-DM1 for residual disease. NEJM 2019',q:'KATHERINE trastuzumab emtansine residual invasive HER2'}], disease:'breast', name:'TCHP, surgery, trastuzumab + pertuzumab',
  trial:'NCCN standard (NeoSphere, TRAIN-2, KATHERINE, DESTINY-Breast05)', summary:'HER2-positive, stage II–III. TCHP ×6, surgery, HER2 therapy by response.',
  title:'Chemotherapy with HER2-targeted antibodies before surgery, then antibodies after',
  subtitle:'HER2-positive breast cancer, stage II to III',
  nodes:[
    P({ name:'Docetaxel + carboplatin + trastuzumab + pertuzumab (TCHP)', short:'Docetaxel + carbo + HER2 antibodies', mods:['chemo','targeted'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs plus two HER2-targeted antibodies, all given by IV every 3 weeks, 6 times.' }),
    RECOVER(4),
    SURGERY_BREAST(true),
    HEAL(4),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'HER2-targeted treatment continues either way, to complete about one year in total.',
        branches:[
          Br('No remaining cancer (complete response)', [
            P({ name:'Trastuzumab + pertuzumab', short:'HER2 antibodies (HP)', mods:['targeted'], cycleDays:21, cycles:11, plain:'The two antibodies continue every 3 weeks, without chemotherapy, to complete one year. Often given as an injection under the skin.' }),
            RADIATION_ALONGSIDE(),
            ENDOCRINE_ALONGSIDE(),
          ]),
          Br('Some cancer remained', [
            P({ name:'Trastuzumab deruxtecan (Enhertu) or trastuzumab emtansine (Kadcyla)', short:'Enhertu or Kadcyla', mods:['targeted'], cycleDays:21, cycles:14, plain:'An antibody that carries chemotherapy directly into HER2-positive cells, every 3 weeks for up to 14 doses.' }),
            RADIATION_ALONGSIDE(),
            ENDOCRINE_ALONGSIDE(),
          ]),
        ] }),
  ]
},
{
  id:'ddac-t', plan:'Chemotherapy after surgery', group:'Triple-negative', added:'2026-08-31', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Citron ML et al. CALGB 9741 dose-dense chemotherapy. JCO 2003',q:'CALGB 9741 dose-dense doxorubicin cyclophosphamide paclitaxel Citron'},{t:'Sparano JA et al. ECOG 1199 weekly paclitaxel. NEJM 2008',q:'ECOG 1199 weekly paclitaxel Sparano NEJM 2008'}], disease:'breast', name:'Surgery, dose-dense AC then weekly paclitaxel',
  trial:'CALGB 9741 / ECOG 1199', summary:'Triple-negative, node-positive or high risk. Adjuvant AC ×4 (every 2 weeks), paclitaxel ×12, radiation. A hormone-therapy step can be switched on if the cancer is hormone-receptor positive.',
  title:'Surgery first, then chemotherapy and radiation',
  subtitle:'Triple-negative breast cancer, stage II to III',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Doxorubicin + cyclophosphamide (dose-dense AC)', short:'Doxorubicin + cyclophosphamide', mods:['chemo'], cycleDays:14, cycles:4,
        plain:'Two chemotherapy drugs every 2 weeks, with a growth-factor injection after each dose to support your blood counts.' }),
    P({ name:'Paclitaxel', short:'Paclitaxel', mods:['chemo'], cycleDays:7, cycles:12, plain:'One chemotherapy drug given weekly for 12 weeks. Visits are shorter than the AC visits.' }),
    RADIATION_AFTER(true),
    P({ name:'Hormone (endocrine) therapy, if hormone-receptor positive', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260, optional:true, on:false,
        plain:'If the cancer is hormone-receptor positive: one tablet a day (such as tamoxifen, letrozole, or anastrozole) for 5 to 10 years, starting once chemotherapy is finished.' }),
  ]
},
{
  id:'hrplus', plan:'Hormone therapy plus a targeted tablet', group:'HR-positive, HER2-negative', added:'2026-08-31', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Johnston SRD et al. monarchE: abemaciclib plus endocrine therapy. JCO 2020',q:'monarchE abemaciclib adjuvant Johnston'},{t:'Slamon D et al. NATALEE: ribociclib plus NSAI. NEJM 2024',q:'NATALEE ribociclib early breast cancer Slamon NEJM 2024'}], disease:'breast', name:'HR-positive high risk: surgery, optional chemo (TC or dose-dense AC-T), endocrine therapy + abemaciclib',
  trial:'monarchE', summary:'HR-positive, HER2-negative, high risk. Surgery, optional chemotherapy (switch on TC or dose-dense AC then paclitaxel), radiation, endocrine therapy plus abemaciclib for 2 years.',
  title:'Surgery, then daily tablets that block hormones and slow cancer-cell growth',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, higher-risk stage II to III',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Chemotherapy (docetaxel + cyclophosphamide), if recommended', short:'Docetaxel + cyclophosphamide', mods:['chemo'], cycleDays:21, cycles:4, optional:true, on:false,
        plain:'Chemotherapy is recommended for some people based on stage and tumor test results (such as Oncotype DX). One common option is docetaxel + cyclophosphamide every 3 weeks, 4 times (about 3 months), with a growth-factor injection after each dose. Your team will say which option, if any, suits your cancer.' }),
    P({ name:'Chemotherapy (dose-dense AC then paclitaxel), if recommended', short:'ddAC then paclitaxel', mods:['chemo'], cycleDays:14, cycles:8, optional:true, on:false,
        plain:'The other common option, often used for higher-risk cancers: doxorubicin and cyclophosphamide every 2 weeks, 4 times, then paclitaxel every 2 weeks, 4 times, or weekly for 12 weeks. A growth-factor injection follows each dose.' }),
    RADIATION_AFTER(true),
    P({ name:'Hormone therapy + abemaciclib (Verzenio)', short:'Hormone + abemaciclib', mods:['endocrine','targeted'], mode:'daily', weeks:104,
        plain:'A daily hormone-blocking tablet plus abemaciclib twice a day for 2 years. Abemaciclib is a targeted drug that slows the growth of cancer cells.' }),
    P({ name:'Hormone therapy continues', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:156,
        plain:'The hormone-blocking tablet continues on its own to complete 5 to 10 years in total.' }),
  ]
},
{
  id:'natalee', plan:'Hormone therapy plus ribociclib for 3 years', group:'HR-positive, HER2-negative', added:'2026-09-01', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Hortobagyi GN et al. Adjuvant ribociclib plus endocrine therapy versus endocrine therapy alone in HR-positive/HER2-negative early breast cancer: final invasive disease-free survival results from NATALEE. Annals of Oncology 2025;36:149-157',q:'NATALEE ribociclib adjuvant final invasive disease-free survival Hortobagyi Annals of Oncology 2025'},{t:'Slamon DJ et al. Rationale and trial design of NATALEE. Therapeutic Advances in Medical Oncology 2023;15:17588359231178125',q:'NATALEE rationale trial design Slamon ribociclib adjuvant 2023'}], disease:'breast', name:'NATALEE: surgery, optional chemo (TC or dose-dense AC-T), then an aromatase inhibitor with ribociclib for 3 years',
  trial:'NATALEE', summary:'HR-positive, HER2-negative, stage IIA (with risk factors) to III. Surgery, optional chemotherapy (switch on TC or dose-dense AC then paclitaxel), radiation, then an aromatase inhibitor with ribociclib for 3 years.',
  title:'Surgery, then a daily hormone tablet with ribociclib for three years',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, stage IIA to III',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Chemotherapy (docetaxel + cyclophosphamide), if beneficial', short:'Docetaxel + cyclophosphamide', mods:['chemo'], cycleDays:21, cycles:4, optional:true, on:false,
        plain:'Chemotherapy is beneficial for some people based on stage and tumor test results (such as Oncotype DX). One common option is docetaxel + cyclophosphamide every 3 weeks, 4 times (about 3 months), with a growth-factor injection after each dose. Your team will say which option, if any, suits your cancer.' }),
    P({ name:'Chemotherapy (dose-dense AC then paclitaxel), if beneficial', short:'ddAC then paclitaxel', mods:['chemo'], cycleDays:14, cycles:8, optional:true, on:false,
        plain:'The other common option, often used for higher-risk cancers: doxorubicin and cyclophosphamide every 2 weeks, 4 times, then paclitaxel every 2 weeks, 4 times, or weekly for 12 weeks. A growth-factor injection follows each dose.' }),
    RADIATION_AFTER(true),
    P({ name:'Aromatase inhibitor + ribociclib (Kisqali)', short:'Hormone + ribociclib', mods:['endocrine','targeted'], mode:'daily', weeks:156,
        plain:'A daily hormone-blocking tablet (letrozole or anastrozole) plus ribociclib for 3 years. Ribociclib is taken for 3 weeks, then 1 week off, over and over. It is a targeted drug that slows the growth of cancer cells. Blood tests and a heart tracing are checked in the first cycles. If you have not been through menopause, an injection every 4 weeks switches off the ovaries.' }),
    P({ name:'Hormone (endocrine) therapy continues', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:104,
        plain:'The hormone-blocking tablet continues on its own to complete at least 5 years in total.' }),
  ]
},

/* ---------------- GI ---------------- */
{
  id:'prodige23', plan:'Treatment before and after rectal surgery', group:'Rectal', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Conroy T et al. PRODIGE 23. Lancet Oncology 2021',q:'PRODIGE 23 mFOLFIRINOX rectal Conroy Lancet Oncology 2021'}], disease:'gi', name:'Rectal TNT: FOLFIRINOX, chemoradiation, surgery, FOLFOX',
  trial:'PRODIGE 23', summary:'Locally advanced rectal cancer. mFOLFIRINOX ×6, long-course chemoradiation, surgery, adjuvant mFOLFOX6 ×6.',
  title:'Chemotherapy and chemoradiation before surgery, then a short course of chemotherapy after',
  subtitle:'Rectal cancer, stage II to III',
  nodes:[
    P({ name:'mFOLFIRINOX', short:'FOLFIRINOX', mods:['chemo'], cycleDays:14, cycles:6,
        visits:[{d:1,label:'Oxaliplatin, irinotecan, leucovorin, then a 5-FU pump worn home for about 46 hours'}],
        plain:'Three chemotherapy drugs by IV every 2 weeks. One of them (5-FU) runs through a small pump you wear home for about 2 days, then a nurse disconnects it.' }),
    P({ name:'Chemoradiation', short:'Radiation + capecitabine', mods:['radiation','chemo'], mode:'weekdays', weeks:5,
        plain:'Radiation to the pelvis every weekday for 5 weeks, with a low-dose chemotherapy tablet (capecitabine) on radiation days to make the radiation work better.' }),
    R('Recovery before surgery', 7, 'About 6 to 8 weeks for the tumor to keep shrinking and your body to recover. Imaging is repeated before surgery.'),
    S('Surgery (rectal resection)', 'Removal of the rectal tumor and surrounding tissue. A temporary ostomy (stoma) is common and is usually reversed a few months later.'),
    R('Healing after surgery', 6, 'Recovery from surgery, usually 6 to 8 weeks before chemotherapy restarts.'),
    P({ name:'mFOLFOX6', short:'FOLFOX', mods:['chemo'], cycleDays:14, cycles:6,
        visits:[{d:1,label:'Oxaliplatin and leucovorin, then a 5-FU pump for about 46 hours'}],
        plain:'Two chemotherapy drugs (oxaliplatin and 5-FU) every 2 weeks for 3 months, to lower the chance of the cancer coming back. Capecitabine tablets are an alternative.' }),
  ]
},
{
  id:'rapido', plan:'Radiation and chemo before rectal surgery', group:'Rectal', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Bahadoer RR et al. RAPIDO. Lancet Oncology 2021',q:'RAPIDO short-course radiotherapy rectal Bahadoer Lancet Oncology 2021'}], disease:'gi', name:'Rectal TNT: short-course radiation, CAPOX, surgery',
  trial:'RAPIDO', summary:'Locally advanced high-risk rectal cancer. 5 days of radiation, CAPOX ×6 (or FOLFOX ×9), surgery.',
  title:'One week of radiation, then chemotherapy, then surgery',
  subtitle:'Rectal cancer, stage II to III (higher risk)',
  nodes:[
    P({ name:'Short-course radiation', short:'Radiation (5 days)', mods:['radiation'], mode:'weekdays', weeks:1,
        plain:'Five daily radiation treatments over one week.' }),
    R('Short break', 2, 'Chemotherapy starts about 2 weeks after radiation ends (11 to 18 days in the RAPIDO trial).'),
    P({ name:'CAPOX', short:'CAPOX', mods:['chemo'], cycleDays:21, cycles:6,
        visits:[{d:1,label:'Oxaliplatin by IV, then capecitabine tablets twice a day for 14 days'}],
        plain:'Oxaliplatin by IV every 3 weeks plus capecitabine tablets at home for 2 of every 3 weeks, for about 4 and a half months. FOLFOX every 2 weeks (9 cycles) is an alternative.' }),
    R('Recovery before surgery', 3, 'A short break of 2 to 4 weeks, with imaging to plan surgery.'),
    S('Surgery (rectal resection)', 'Removal of the rectal tumor and surrounding tissue. A temporary ostomy (stoma) is common and is usually reversed a few months later.'),
    R('Healing after surgery', 6, 'Recovery from surgery. No further chemotherapy is planned after surgery in this approach.'),
  ]
},
{
  id:'opra', plan:'Treatment first, surgery only if needed', group:'Rectal', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Garcia-Aguilar J et al. OPRA organ preservation. JCO 2022',q:'OPRA organ preservation rectal Garcia-Aguilar JCO 2022'},{t:'Verheij FS et al. OPRA long-term results. JCO 2024',q:'OPRA long-term results watch-and-wait Verheij'}], disease:'gi', name:'Rectal organ preservation: chemoradiation, FOLFOX, then watch-and-wait or surgery',
  trial:'OPRA', summary:'Rectal cancer aiming to avoid surgery. Chemoradiation, consolidation FOLFOX ×8, restaging, then watch-and-wait if complete response.',
  title:'Chemoradiation and chemotherapy first, then a decision about surgery',
  subtitle:'Rectal cancer, stage II to III',
  nodes:[
    P({ name:'Chemoradiation', short:'Radiation + capecitabine', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation to the pelvis every weekday for about 5 to 6 weeks, with a low-dose chemotherapy tablet (capecitabine) on radiation days.' }),
    P({ name:'Consolidation chemotherapy (FOLFOX)', short:'FOLFOX', mods:['chemo'], cycleDays:14, cycles:8,
        visits:[{d:1,label:'Oxaliplatin and leucovorin, then a 5-FU pump for about 46 hours'}],
        plain:'Oxaliplatin and 5-FU every 2 weeks for 8 cycles (about 4 months), given after radiation to shrink the tumor as much as possible. CAPOX (5 cycles) is an alternative.' }),
    R('Recovery and restaging', 8, 'About 8 weeks after chemotherapy ends (the trial allowed 4 to 12): an exam, a scope, and an MRI to see whether any tumor remains.'),
    D({ name:'Restaging results', short:'Results', question:'Is there any tumor left?',
        plain:'Whether surgery is needed depends on what the exam, scope, and MRI show.',
        branches:[
          Br('No tumor found (complete response)', [
            P({ name:'Watch and wait (close monitoring)', short:'Watch and wait', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exam, scope, and MRI every 3 to 4 months',
                plain:'No surgery for now. Exams, scopes, and MRIs every 3 to 4 months for 2 years, then less often. If the tumor regrows, surgery is done at that point and is still effective for most people.' }),
          ]),
          Br('Tumor still present', [
            S('Surgery (rectal resection)', 'Removal of the rectal tumor and surrounding tissue. A temporary ostomy (stoma) is common and is usually reversed a few months later.'),
            R('Healing after surgery', 6, 'Recovery from surgery, followed by regular monitoring.'),
          ]),
        ] }),
  ]
},
{
  id:'tnt-lcrt', plan:'Chemoradiation and chemotherapy before surgery', group:'Rectal', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Fokas E et al. Chemoradiotherapy plus induction or consolidation chemotherapy as total neoadjuvant therapy for locally advanced rectal cancer: long-term results of the CAO/ARO/AIO-12 randomized clinical trial. JAMA Oncology 2022;8:e215445',q:'CAO/ARO/AIO-12 Fokas induction consolidation total neoadjuvant rectal JAMA Oncology 2022'},{t:'Fokas E et al. Pooled analysis of the CAO/ARO/AIO-12 and OPRA randomized phase 2 trials. European Journal of Cancer 2024;210:114291',q:'CAO/ARO/AIO-12 OPRA pooled analysis total neoadjuvant sequence Fokas European Journal of Cancer 2024'}], disease:'gi', name:'Long-course chemoradiation and chemotherapy before surgery, then rectal resection',
  trial:'CAO/ARO/AIO-12', summary:'Locally advanced rectal cancer (cT3-4 and/or node-positive). Long-course chemoradiation and FOLFOX before total mesorectal excision. The trial tested both orders and found similar long-term results.',
  title:'Chemoradiation and chemotherapy before surgery, given in either order',
  subtitle:'Rectal cancer, locally advanced (stage II to III)',
  nodes:[
    P({ name:'Chemoradiation (long course)', short:'Chemoradiation', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation to the pelvis every weekday for about 5 to 6 weeks, with low-dose chemotherapy on radiation days to make the radiation work better. This step and the chemotherapy step can be given in either order; the trial tested both and found similar results after several years. Your team decides which order suits you, and you can ask why.' }),
    R('Recovery', 2, 'A short break before the next step.'),
    P({ name:'FOLFOX chemotherapy', short:'FOLFOX', mods:['chemo'], cycleDays:14, cycles:3,
        plain:'Three cycles of chemotherapy, each given every 2 weeks, partly in clinic and partly through a small pump you take home for about two days. If your team gives the chemotherapy first instead, these same cycles come before the chemoradiation.' }),
    RECOVER(4),
    S('Surgery (total mesorectal excision)', 'An operation to remove the rectum together with the surrounding fatty tissue and lymph nodes. In the trial, surgery was planned for about 4 months after treatment started.'),
    R('Healing after surgery', 6, 'Time to recover from the operation. A temporary ostomy (stoma) is common and is usually reversed later.'),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits, blood tests, and scans every 3 to 6 months',
        plain:'Regular visits, blood tests, scopes, and scans. How often depends on how you are doing.' }),
  ]
},
{
  id:'flot', plan:'Chemo-immunotherapy around stomach surgery', group:'Esophageal and stomach', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Al-Batran SE et al. FLOT4-AIO. Lancet 2019',q:'FLOT4 perioperative docetaxel oxaliplatin Al-Batran Lancet 2019'},{t:'Janjigian YY et al. MATTERHORN: perioperative durvalumab. NEJM 2025',q:'MATTERHORN durvalumab FLOT gastric NEJM 2025'}], disease:'gi', name:'Gastric/GEJ: FLOT + durvalumab, surgery, FLOT + durvalumab',
  trial:'FLOT4 / MATTERHORN', summary:'Resectable stomach or GEJ adenocarcinoma. FLOT ×4 with durvalumab, surgery, FLOT ×4 with durvalumab, durvalumab ×10.',
  title:'Chemotherapy with immunotherapy before and after surgery',
  subtitle:'Stomach or gastroesophageal junction cancer, stage II to III',
  nodes:[
    P({ name:'FLOT chemotherapy', short:'FLOT', mods:['chemo'], cycleDays:14, cycles:4,
        visits:[{d:1,label:'Docetaxel, oxaliplatin, leucovorin, then a 5-FU pump worn home for 24 hours'}],
        plain:'Four chemotherapy drugs by IV every 2 weeks, 4 times. One of them (5-FU) runs through a small pump you wear home for a day.' }),
    P({ name:'Durvalumab (Imfinzi)', short:'Durvalumab', mods:['io'], cycleDays:28, cycles:2, optional:true, on:true, concurrent:true,
        plain:'Immunotherapy by IV every 4 weeks, on the same days as chemotherapy: 2 doses before surgery. It helps your immune system recognize and attack cancer cells.' }),
    R('Recovery before surgery', 5, 'About 4 to 6 weeks to recover, with scans to plan the operation.'),
    S('Surgery (gastrectomy)', 'Removal of part or all of the stomach, with nearby lymph nodes. Recovery takes several weeks and includes learning a new way of eating.'),
    R('Healing after surgery', 7, 'Recovery and adjusting to eating after stomach surgery, usually 6 to 8 weeks before treatment restarts.'),
    P({ name:'FLOT chemotherapy', short:'FLOT', mods:['chemo'], cycleDays:14, cycles:4,
        visits:[{d:1,label:'Docetaxel, oxaliplatin, leucovorin, then a 5-FU pump worn home for 24 hours'}],
        plain:'The same four chemotherapy drugs every 2 weeks, 4 more times.' }),
    P({ name:'Durvalumab (Imfinzi)', short:'Durvalumab', mods:['io'], cycleDays:28, cycles:2, optional:true, on:true, concurrent:true,
        plain:'Immunotherapy every 4 weeks, on chemotherapy days: 2 doses after surgery.' }),
    P({ name:'Durvalumab (Imfinzi) alone', short:'Durvalumab alone', mods:['io'], cycleDays:28, cycles:10, optional:true, on:true,
        plain:'Immunotherapy on its own every 4 weeks for 10 more doses (about 10 months). Each visit is short.' }),
  ]
},
{
  id:'cross', plan:'Chemoradiation, then surgery', group:'Esophageal and stomach', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'van Hagen P et al. CROSS. NEJM 2012',q:'CROSS chemoradiotherapy esophageal van Hagen NEJM 2012'},{t:'Kelly RJ et al. CheckMate 577: adjuvant nivolumab. NEJM 2021',q:'CheckMate 577 adjuvant nivolumab esophageal Kelly NEJM 2021'}], disease:'gi', name:'Esophageal: CROSS chemoradiation, surgery, nivolumab if needed',
  trial:'CROSS / CheckMate 577', summary:'Esophageal or GEJ cancer, stage II–III. Weekly carboplatin/paclitaxel with radiation, surgery, adjuvant nivolumab if cancer remained.',
  title:'Chemoradiation, then surgery, then immunotherapy if any cancer remained',
  subtitle:'Esophageal or gastroesophageal junction cancer, stage II to III',
  nodes:[
    P({ name:'Chemoradiation (CROSS)', short:'Radiation + carbo/paclitaxel', mods:['radiation','chemo'], mode:'weekdays', weeks:5,
        plain:'Radiation every weekday for about 5 weeks, plus low-dose carboplatin and paclitaxel by IV once a week to make the radiation more effective.' }),
    R('Recovery before surgery', 7, 'Recovery and restaging scans. Surgery usually happens 6 to 8 weeks after radiation ends.'),
    S('Surgery (esophagectomy)', 'Removal of the affected part of the esophagus; the stomach is reshaped to reconnect. Recovery takes several weeks.'),
    R('Healing after surgery', 8, 'Recovery from surgery; treatment, if needed, restarts 4 to 16 weeks after the operation.'),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'If no cancer remained in the removed tissue, no further treatment is needed. If some remained, a year of immunotherapy lowers the chance of it coming back.',
        branches:[
          Br('No remaining cancer (complete response)', [
            P({ name:'Monitoring', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Visits and scans every 3 to 6 months',
                plain:'No further treatment. Visits and scans on a regular schedule.' }),
          ]),
          Br('Some cancer remained', [
            P({ name:'Nivolumab (Opdivo)', short:'Nivolumab', mods:['io'], cycleDays:14, cycles:8, plain:'Immunotherapy by IV every 2 weeks for the first 16 weeks. It helps your immune system recognize and attack cancer cells.' }),
            P({ name:'Nivolumab (Opdivo)', short:'Nivolumab', mods:['io'], cycleDays:28, cycles:9, plain:'Then every 4 weeks to complete one year in total.' }),
          ]),
        ] }),
  ]
},
{
  id:'capox', plan:'Chemotherapy after colon surgery', group:'Colon', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Grothey A et al. IDEA collaboration: 3 vs 6 months. NEJM 2018',q:'IDEA collaboration duration adjuvant oxaliplatin colon Grothey NEJM 2018'}], disease:'gi', name:'Colon stage III: surgery, CAPOX (3 or 6 months)',
  trial:'IDEA collaboration', summary:'Stage III colon cancer. Surgery, adjuvant CAPOX ×4 (3 months) or ×8 (6 months), surveillance.',
  title:'Surgery, then chemotherapy to lower the chance of the cancer returning',
  subtitle:'Colon cancer, stage III',
  nodes:[
    S('Surgery (colectomy)', 'Removal of the section of colon containing the cancer, with nearby lymph nodes.'),
    R('Healing after surgery', 5, 'Recovery from surgery. Chemotherapy usually starts within 6 to 8 weeks of the operation.'),
    P({ name:'CAPOX', short:'CAPOX', mods:['chemo'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Oxaliplatin by IV, then capecitabine tablets twice a day for 14 days'}],
        plain:'Oxaliplatin by IV every 3 weeks plus capecitabine tablets at home for 2 of every 3 weeks. Four cycles (3 months) for most stage III cancers; 8 cycles (6 months) for higher-risk cancers, such as those that grew through the colon wall or involve several lymph nodes. Your team chooses the length based on those risk features. FOLFOX every 2 weeks is an alternative.' }),
    P({ name:'Monitoring (surveillance)', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Blood test every 3 to 6 months, scan yearly',
        plain:'Regular check-ups: a blood test (CEA) every 3 to 6 months, a CT scan every 6 to 12 months, and a colonoscopy about one year after surgery.' }),
  ]
},
{
  id:'prodige24', plan:'Chemotherapy after pancreas surgery', group:'Pancreas', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Conroy T et al. PRODIGE 24: adjuvant mFOLFIRINOX. NEJM 2018',q:'PRODIGE 24 FOLFIRINOX adjuvant pancreatic Conroy NEJM 2018'}], disease:'gi', name:'Pancreatic: surgery, adjuvant mFOLFIRINOX',
  trial:'PRODIGE 24', summary:'Resected pancreatic cancer. Surgery, mFOLFIRINOX ×12 (6 months), surveillance.',
  title:'Surgery, then six months of chemotherapy',
  subtitle:'Pancreatic cancer, removed by surgery',
  nodes:[
    S('Surgery (Whipple or distal pancreatectomy)', 'Removal of the part of the pancreas containing the cancer, with nearby lymph nodes.'),
    R('Healing after surgery', 8, 'Recovery from surgery. Chemotherapy usually starts 6 to 12 weeks after the operation.'),
    P({ name:'mFOLFIRINOX', short:'FOLFIRINOX', mods:['chemo'], cycleDays:14, cycles:12,
        visits:[{d:1,label:'Oxaliplatin, irinotecan, leucovorin, then a 5-FU pump worn home for about 46 hours'}],
        plain:'Three chemotherapy drugs by IV every 2 weeks for 6 months. One of them (5-FU) runs through a small pump you wear home for about 2 days.' }),
    P({ name:'Monitoring (surveillance)', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Visits, blood tests, and scans every 3 to 6 months',
        plain:'Regular visits with blood tests and scans every 3 to 6 months.' }),
  ]
},

/* ---------------- LUNG ---------------- */
{
  id:'kn671', plan:'Chemo-immunotherapy around lung surgery', group:'Non-small cell, operable', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Wakelee H et al. KEYNOTE-671. NEJM 2023',q:'KEYNOTE-671 perioperative pembrolizumab Wakelee NEJM 2023'}], disease:'lung', name:'KEYNOTE-671: chemo + pembrolizumab, surgery, pembrolizumab',
  trial:'KEYNOTE-671', summary:'Resectable NSCLC, stage II–IIIB. Cisplatin doublet + pembrolizumab ×4, surgery, pembrolizumab ×13.',
  title:'Chemotherapy with immunotherapy before surgery, then immunotherapy after',
  subtitle:'Non-small cell lung cancer, stage II to III (operable)',
  nodes:[
    P({ name:'Cisplatin-based chemotherapy + pembrolizumab (Keytruda)', short:'Cisplatin chemo + pembrolizumab', mods:['chemo','io'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Cisplatin, pemetrexed (or gemcitabine), and pembrolizumab'}],
        plain:'Chemotherapy (cisplatin with pemetrexed or gemcitabine) plus pembrolizumab every 3 weeks, 4 times, to shrink the cancer before surgery. Pembrolizumab is immunotherapy: it helps your immune system recognize and attack cancer cells.' }),
    RECOVER(4),
    S('Surgery (lung resection)', 'Removal of the lobe (or part) of the lung containing the cancer, plus nearby lymph nodes.'),
    R('Healing after surgery', 6, 'Recovery from surgery. Treatment restarts 4 to 12 weeks after the operation.'),
    RADIATION_AFTER(false),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:13, plain:'Immunotherapy on its own every 3 weeks for 13 doses (about 9 months). Each visit is short.' }),
  ]
},
{
  id:'cm816', plan:'Chemo-immunotherapy before lung surgery', group:'Non-small cell, operable', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Forde PM et al. CheckMate 816. NEJM 2022',q:'CheckMate 816 neoadjuvant nivolumab Forde NEJM 2022'}], disease:'lung', name:'CheckMate 816: chemo + nivolumab, then surgery',
  trial:'CheckMate 816', summary:'Resectable NSCLC, stage IB–IIIA. Platinum doublet + nivolumab ×3, surgery, then treatment based on pathology.',
  title:'Chemotherapy with immunotherapy before surgery',
  subtitle:'Non-small cell lung cancer, stage IB to IIIA (operable)',
  nodes:[
    P({ name:'Platinum-based chemotherapy + nivolumab (Opdivo)', short:'Platinum chemo + nivolumab', mods:['chemo','io'], cycleDays:21, cycles:3,
        plain:'Chemotherapy plus nivolumab immunotherapy every 3 weeks, 3 times, to shrink the cancer before surgery.' }),
    RECOVER(4),
    S('Surgery (lung resection)', 'Removal of the lobe (or part) of the lung containing the cancer, plus nearby lymph nodes.'),
    R('Healing after surgery', 6, 'Recovery from surgery while the pathology report is reviewed.'),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'If no cancer remained, monitoring is enough. If some remained, your doctor will discuss further treatment.',
        branches:[
          Br('No remaining cancer (complete response)', [
            P({ name:'Monitoring', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Visits and scans every 3 to 6 months', plain:'No further treatment. Visits and CT scans on a regular schedule.' }),
          ]),
          Br('Some cancer remained', [
            P({ name:'Further treatment (to be discussed)', short:'Further treatment', mods:['io'], cycleDays:28, cycles:13, optional:true, on:true,
                plain:'In the CheckMate 816 trial itself, the options after surgery were up to 4 cycles of chemotherapy, radiation, or both, at the care team\'s discretion. Continuing immunotherapy for up to a year (as in the CheckMate 77T study) is another approach your doctor may discuss, depending on the pathology.' }),
          ]),
        ] }),
  ]
},
{
  id:'cm77t', plan:'Chemo-immunotherapy around lung surgery', group:'Non-small cell, operable', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Cascone T et al. CheckMate 77T. NEJM 2024',q:'CheckMate 77T perioperative nivolumab Cascone NEJM 2024'}], disease:'lung', name:'CheckMate 77T: chemo + nivolumab, surgery, nivolumab',
  trial:'CheckMate 77T', summary:'Resectable NSCLC, stage II–IIIB. Platinum doublet + nivolumab ×4, surgery, nivolumab every 4 weeks for a year.',
  title:'Chemotherapy with immunotherapy before surgery, then immunotherapy after',
  subtitle:'Non-small cell lung cancer, stage II to III (operable)',
  nodes:[
    P({ name:'Platinum-based chemotherapy + nivolumab (Opdivo)', short:'Platinum chemo + nivolumab', mods:['chemo','io'], cycleDays:21, cycles:4,
        plain:'Chemotherapy plus nivolumab immunotherapy every 3 weeks, 4 times, to shrink the cancer before surgery.' }),
    RECOVER(4),
    S('Surgery (lung resection)', 'Removal of the lobe (or part) of the lung containing the cancer, plus nearby lymph nodes.'),
    R('Healing after surgery', 6, 'Recovery from surgery before immunotherapy restarts.'),
    P({ name:'Nivolumab (Opdivo)', short:'Nivolumab', mods:['io'], cycleDays:28, cycles:13, plain:'Immunotherapy on its own every 4 weeks for up to a year. Each visit is short.' }),
  ]
},
{
  id:'pacific', plan:'Chemoradiation, then immunotherapy', group:'Non-small cell, stage III', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Antonia SJ et al. PACIFIC. NEJM 2017 (durvalumab 10 mg/kg every 2 weeks for up to 12 months)',q:'PACIFIC durvalumab stage III Antonia NEJM 2017'},{t:'FDA labeling: durvalumab (Imfinzi) 1500 mg every 4 weeks alternative dosing, approved November 2020',q:'FDA durvalumab Imfinzi 1500 mg four week dosing approval 2020'}], disease:'lung', name:'PACIFIC: chemoradiation, then durvalumab',
  trial:'PACIFIC', summary:'Unresectable stage III NSCLC. Concurrent chemoradiation, then durvalumab for up to 12 months.',
  title:'Chemoradiation, then a year of immunotherapy',
  subtitle:'Non-small cell lung cancer, stage III (not treated with surgery)',
  nodes:[
    P({ name:'Chemoradiation', short:'Chemoradiation', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation to the chest every weekday for about 6 weeks, with chemotherapy at the same time (commonly weekly carboplatin and paclitaxel, or cisplatin and etoposide every 3 weeks).' }),
    R('Recovery', 3, 'A short break of 1 to 6 weeks. A CT scan confirms the cancer has not grown before immunotherapy starts.'),
    P({ name:'Durvalumab (Imfinzi)', short:'Durvalumab', mods:['io'], cycleDays:14, cycles:26, plain:'Immunotherapy by IV every 2 weeks for up to 12 months, as in the trial. Some centers give a double dose every 4 weeks instead; either way it stops at one year. It helps your immune system keep the cancer from coming back.' }),
  ]
},
{
  id:'adaura', plan:'Surgery, then a targeted tablet', group:'Non-small cell, operable', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Wu YL et al. ADAURA. NEJM 2020',q:'ADAURA osimertinib adjuvant Wu NEJM 2020'},{t:'Tsuboi M et al. ADAURA overall survival. NEJM 2023',q:'ADAURA overall survival osimertinib Tsuboi NEJM 2023'}], disease:'lung', name:'ADAURA: surgery, chemo, osimertinib for 3 years',
  trial:'ADAURA', summary:'EGFR-mutated NSCLC, stage IB–IIIA, resected. Surgery, optional cisplatin doublet ×4, osimertinib daily for 3 years.',
  title:'Surgery, then a daily targeted tablet for three years',
  subtitle:'Non-small cell lung cancer with an EGFR mutation, stage IB to IIIA',
  nodes:[
    S('Surgery (lung resection)', 'Removal of the lobe (or part) of the lung containing the cancer, plus nearby lymph nodes.'),
    HEAL(6),
    P({ name:'Chemotherapy (if recommended)', short:'Cisplatin chemo', mods:['chemo'], cycleDays:21, cycles:4, optional:true, on:true,
        plain:'Cisplatin-based chemotherapy every 3 weeks, 4 times, is recommended for many stage II to III cancers before starting the targeted tablet.' }),
    P({ name:'Osimertinib (Tagrisso)', short:'Osimertinib', mods:['targeted'], mode:'daily', weeks:156, freqText:'One tablet daily; clinic visits every 2 to 3 months',
        plain:'A targeted tablet taken once a day for 3 years. It blocks the EGFR signal that drives this type of cancer. Clinic visits and scans every few months.' }),
    P({ name:'Monitoring (surveillance)', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and scans every 6 months', plain:'Regular visits and CT scans after the tablet is finished.' }),
  ]
},
{
  id:'alina', plan:'Surgery, then a targeted tablet', group:'Non-small cell, operable', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending', refs:[{t:'Wu YL et al. ALINA: adjuvant alectinib. NEJM 2024',q:'ALINA alectinib adjuvant ALK Wu NEJM 2024'}], disease:'lung', name:'ALINA: surgery, alectinib for 2 years',
  trial:'ALINA', summary:'ALK-positive NSCLC, stage IB–IIIA, resected. Surgery, alectinib twice daily for 2 years.',
  title:'Surgery, then a targeted tablet for two years',
  subtitle:'Non-small cell lung cancer with an ALK rearrangement, stage IB to IIIA',
  nodes:[
    S('Surgery (lung resection)', 'Removal of the lobe (or part) of the lung containing the cancer, plus nearby lymph nodes.'),
    HEAL(6),
    P({ name:'Alectinib (Alecensa)', short:'Alectinib', mods:['targeted'], mode:'daily', weeks:104, freqText:'Tablets twice daily; clinic visits every 2 to 3 months',
        plain:'A targeted tablet taken twice a day for 2 years. It blocks the ALK signal that drives this type of cancer. Clinic visits and scans every few months.' }),
    P({ name:'Monitoring (surveillance)', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and scans every 6 months', plain:'Regular visits and CT scans after the tablet is finished.' }),
  ]
},
{
  id:'laura', plan:'Chemoradiation, then a targeted tablet', group:'Non-small cell, stage III', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Lu S et al. LAURA. NEJM 2024',q:'LAURA osimertinib after chemoradiotherapy stage III NEJM 2024'}], disease:'lung', name:'LAURA: chemoradiation, then osimertinib',
  trial:'LAURA', summary:'EGFR-mutated unresectable stage III NSCLC. Chemoradiation, then osimertinib daily as long as it keeps working.',
  title:'Chemoradiation, then a daily targeted tablet',
  subtitle:'Non-small cell lung cancer with an EGFR mutation, stage III (not treated with surgery)',
  nodes:[
    P({ name:'Chemoradiation', short:'Chemoradiation', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation to the chest every weekday for about 6 weeks, with chemotherapy at the same time.' }),
    R('Recovery', 3, 'A short break of 1 to 6 weeks. A CT scan confirms the cancer has not grown before the tablet starts.'),
    P({ name:'Osimertinib (Tagrisso)', short:'Osimertinib', mods:['targeted'], mode:'daily', weeks:156, openEnded:true, freqText:'One tablet daily; clinic visits every 2 to 3 months',
        plain:'A targeted tablet taken once a day for as long as it keeps the cancer controlled, which is often years. Scans every few months check that it is working.' }),
  ]
},
{
  id:'adriatic', plan:'Chemoradiation, then immunotherapy', group:'Small cell', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02', refs:[{t:'Cheng Y et al. ADRIATIC. NEJM 2024 (durvalumab every 4 weeks for up to 24 months)',q:'ADRIATIC durvalumab limited-stage small-cell Cheng NEJM 2024'}], disease:'lung', name:'Limited-stage SCLC: chemoradiation, then durvalumab',
  trial:'ADRIATIC', summary:'Limited-stage small cell lung cancer. Cisplatin/etoposide ×4 with concurrent chest radiation, optional PCI, durvalumab for up to 2 years.',
  title:'Chemotherapy with radiation, then up to two years of immunotherapy',
  subtitle:'Small cell lung cancer, limited stage',
  nodes:[
    P({ name:'Cisplatin (or carboplatin) + etoposide', short:'Cisplatin + etoposide', mods:['chemo'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Cisplatin and etoposide'},{d:2,label:'Etoposide'},{d:3,label:'Etoposide'}],
        plain:'Chemotherapy every 3 weeks, 4 times. Etoposide is given on 3 days in a row at the start of each cycle.' }),
    P({ name:'Radiation to the chest', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:3, concurrent:true,
        plain:'Radiation to the chest twice a day for 3 weeks (or once a day for about 6 weeks), starting with the first or second chemotherapy cycle.' }),
    P({ name:'Preventive brain radiation (PCI)', short:'Brain radiation', mods:['radiation'], mode:'weekdays', weeks:2, optional:true, on:false,
        plain:'Low-dose radiation to the brain over about 2 weeks to lower the chance of cancer spreading there. Recommended for some people; MRI monitoring is an alternative.' }),
    R('Recovery', 3, 'A short break of 1 to 6 weeks, with scans to confirm the cancer has responded.'),
    P({ name:'Durvalumab (Imfinzi)', short:'Durvalumab', mods:['io'], cycleDays:28, cycles:26, plain:'Immunotherapy by IV every 4 weeks for up to 2 years. Treatment stops at 24 months at the latest; the exact number of doses depends on when it started. It helps your immune system keep the cancer from coming back.' }),
  ]
},

/* ---------------- BREAST (additions) ---------------- */
{
  id:'apt', plan:'Paclitaxel and trastuzumab after surgery', group:'HER2-positive', added:'2026-08-31', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Tolaney SM et al. APT trial: paclitaxel and trastuzumab for small HER2-positive cancers. NEJM 2015',q:'APT trial adjuvant paclitaxel trastuzumab node-negative HER2 Tolaney NEJM 2015'}],
  disease:'breast', name:'APT: surgery, weekly paclitaxel + trastuzumab, then trastuzumab',
  trial:'APT trial', summary:'HER2-positive, small (≤3 cm), node-negative. Surgery, weekly paclitaxel + trastuzumab ×12, then trastuzumab (weekly or every 3 weeks) to complete one year.',
  title:'Surgery first, then gentle weekly chemotherapy with a HER2 antibody, then the antibody alone',
  subtitle:'HER2-positive breast cancer, stage I',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Paclitaxel + trastuzumab', short:'Paclitaxel + trastuzumab', mods:['chemo','targeted'], cycleDays:7, cycles:12,
        visits:[{d:1,label:'Paclitaxel and trastuzumab'}],
        plain:'A lower-intensity chemotherapy (paclitaxel) plus the HER2 antibody trastuzumab, both given weekly for 12 weeks.' }),
    P({ name:'Trastuzumab', short:'Trastuzumab', mods:['targeted'], cycleDays:21, cycles:13,
        plain:'The HER2 antibody continues on its own, either weekly or every 3 weeks, to complete one year. Often given as an injection under the skin.' }),
    RADIATION_ALONGSIDE(),
    ENDOCRINE_ALONGSIDE(),
  ]
},
{
  id:'tc4', plan:'Short chemotherapy after surgery', group:'Triple-negative', added:'2026-08-31', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Jones S et al. US Oncology 9735: docetaxel + cyclophosphamide vs AC. JCO 2009',q:'US Oncology 9735 docetaxel cyclophosphamide adjuvant Jones JCO 2009'}],
  disease:'breast', name:'Surgery, then docetaxel + cyclophosphamide ×4 (TC)',
  trial:'US Oncology 9735', summary:'Triple-negative, lower risk. Surgery, TC every 3 weeks ×4, radiation. A hormone-therapy step can be switched on if the cancer is hormone-receptor positive.',
  title:'Surgery first, then four cycles of chemotherapy',
  subtitle:'Triple-negative breast cancer, stage I to II',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Docetaxel + cyclophosphamide (TC)', short:'Docetaxel + cyclophosphamide', mods:['chemo'], cycleDays:21, cycles:4,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 4 times (about 3 months). A growth-factor injection after each dose supports your blood counts.' }),
    RADIATION_AFTER(true),
    P({ name:'Hormone (endocrine) therapy, if hormone-receptor positive', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260, optional:true, on:false,
        plain:'If the cancer is hormone-receptor positive: one tablet a day for 5 to 10 years, starting after chemotherapy.' }),
  ]
},
{
  id:'ddac-t-hr', plan:'Chemotherapy, then hormone therapy', group:'HR-positive, HER2-negative', added:'2026-09-03', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Citron ML et al. CALGB 9741 dose-dense chemotherapy. JCO 2003',q:'CALGB 9741 dose-dense doxorubicin cyclophosphamide paclitaxel Citron'},{t:'Sparano JA et al. ECOG 1199 weekly paclitaxel. NEJM 2008',q:'ECOG 1199 weekly paclitaxel Sparano NEJM 2008'},{t:'Early Breast Cancer Trialists\' Collaborative Group. Aromatase inhibitors versus tamoxifen in early breast cancer: patient-level meta-analysis. Lancet 2015',q:'EBCTCG aromatase inhibitors versus tamoxifen meta-analysis Lancet 2015'}],
  disease:'breast', name:'Surgery, dose-dense AC then weekly paclitaxel, then endocrine therapy',
  trial:'CALGB 9741 / ECOG 1199', summary:'HR-positive, HER2-negative, node-positive or high risk, when chemotherapy is planned. Adjuvant AC ×4 (every 2 weeks), paclitaxel ×12, radiation, then endocrine therapy for 5 to 10 years.',
  title:'Surgery first, then chemotherapy, radiation, and hormone therapy',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, stage II to III',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Doxorubicin + cyclophosphamide (dose-dense AC)', short:'Doxorubicin + cyclophosphamide', mods:['chemo'], cycleDays:14, cycles:4,
        plain:'Two chemotherapy drugs every 2 weeks, with a growth-factor injection after each dose to support your blood counts.' }),
    P({ name:'Paclitaxel', short:'Paclitaxel', mods:['chemo'], cycleDays:7, cycles:12, plain:'One chemotherapy drug given weekly for 12 weeks. Visits are shorter than the AC visits.' }),
    RADIATION_AFTER(true),
    P({ name:'Hormone (endocrine) therapy', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260,
        plain:'One tablet a day (such as tamoxifen, letrozole, or anastrozole) for 5 to 10 years, starting once chemotherapy is finished. Your team chooses the tablet and how long to continue.' }),
  ]
},
{
  id:'tc4-hr', plan:'Short chemotherapy, then hormone therapy', group:'HR-positive, HER2-negative', added:'2026-09-03', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Jones S et al. US Oncology 9735: docetaxel + cyclophosphamide vs AC. JCO 2009',q:'US Oncology 9735 docetaxel cyclophosphamide adjuvant Jones JCO 2009'},{t:'Early Breast Cancer Trialists\' Collaborative Group. Aromatase inhibitors versus tamoxifen in early breast cancer: patient-level meta-analysis. Lancet 2015',q:'EBCTCG aromatase inhibitors versus tamoxifen meta-analysis Lancet 2015'}],
  disease:'breast', name:'Surgery, then docetaxel + cyclophosphamide ×4 (TC), then endocrine therapy',
  trial:'US Oncology 9735', summary:'HR-positive, HER2-negative, lower risk, when chemotherapy is planned. Surgery, TC every 3 weeks ×4, radiation, then endocrine therapy for 5 to 10 years.',
  title:'Surgery first, then four cycles of chemotherapy, then hormone therapy',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, stage I to II',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    P({ name:'Docetaxel + cyclophosphamide (TC)', short:'Docetaxel + cyclophosphamide', mods:['chemo'], cycleDays:21, cycles:4,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 4 times (about 3 months). A growth-factor injection after each dose supports your blood counts.' }),
    RADIATION_AFTER(true),
    P({ name:'Hormone (endocrine) therapy', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260,
        plain:'One tablet a day (such as tamoxifen, letrozole, or anastrozole) for 5 to 10 years, starting after chemotherapy. Your team chooses the tablet and how long to continue.' }),
  ]
},
{
  id:'endo', plan:'Hormone therapy after surgery', group:'HR-positive, HER2-negative', added:'2026-08-31', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Davies C et al. ATLAS: 10 years of tamoxifen. Lancet 2013',q:'ATLAS tamoxifen 10 years Davies Lancet 2013'},{t:'Sparano JA et al. TAILORx. NEJM 2018',q:'TAILORx Oncotype 21-gene Sparano NEJM 2018'}],
  disease:'breast', name:'Surgery, radiation, endocrine therapy only',
  trial:'NCCN standard (TAILORx, ATLAS)', summary:'HR-positive, HER2-negative, lower risk (low genomic score). Surgery, radiation, 5–10 years of a hormone-blocking tablet. No chemotherapy.',
  title:'Surgery and radiation, then a daily hormone-blocking tablet',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, stage I to II',
  nodes:[
    SURGERY_BREAST(),
    HEAL(4),
    RADIATION_AFTER(true),
    P({ name:'Hormone (endocrine) therapy', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260,
        plain:'One tablet a day (tamoxifen, or an aromatase inhibitor such as letrozole or anastrozole) for 5 to 10 years. For some premenopausal women, an injection to pause the ovaries is added.' }),
  ]
},

/* ---------------- GU ---------------- */
{
  id:'niagara', plan:'Chemo-immunotherapy around bladder surgery', group:'Bladder', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Powles T et al. NIAGARA: perioperative durvalumab. NEJM 2024;391:1773',q:'NIAGARA durvalumab neoadjuvant chemotherapy bladder Powles NEJM 2024'}],
  disease:'gu', name:'NIAGARA: chemo + durvalumab, cystectomy, durvalumab',
  trial:'NIAGARA', summary:'Muscle-invasive bladder cancer, cisplatin-eligible. Gemcitabine/cisplatin + durvalumab ×4, cystectomy, durvalumab ×8.',
  title:'Chemotherapy with immunotherapy before bladder surgery, then immunotherapy after',
  subtitle:'Muscle-invasive bladder cancer (stage II to IIIA)',
  nodes:[
    P({ name:'Gemcitabine + cisplatin + durvalumab (Imfinzi)', short:'Gem/cis + durvalumab', mods:['chemo','io'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Cisplatin, gemcitabine, and durvalumab'},{d:8,label:'Gemcitabine'}],
        plain:'Two chemotherapy drugs (gemcitabine on days 1 and 8, cisplatin on day 1) plus durvalumab every 3 weeks, 4 times. Durvalumab is immunotherapy: it helps your immune system recognize and attack cancer cells.' }),
    R('Recovery before surgery', 5, 'About 4 to 6 weeks to recover, with scans and surgical planning.'),
    S('Surgery (radical cystectomy)', 'Removal of the bladder with nearby lymph nodes, and creation of a new way for urine to leave the body (a urinary diversion). Recovery takes several weeks.'),
    R('Healing after surgery', 8, 'Recovery from surgery, usually 6 to 10 weeks before immunotherapy restarts.'),
    P({ name:'Durvalumab (Imfinzi)', short:'Durvalumab', mods:['io'], cycleDays:28, cycles:8, plain:'Immunotherapy on its own every 4 weeks for 8 doses (about 8 months). Each visit is short.' }),
  ]
},
{
  id:'ev303', plan:'Antibody-drug and immunotherapy around bladder surgery', group:'Bladder', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'KEYNOTE-905 / EV-303: perioperative enfortumab vedotin + pembrolizumab, cisplatin-ineligible MIBC (ESMO 2025 LBA2; FDA approval Nov 2025)',q:'KEYNOTE-905 EV-303 enfortumab vedotin pembrolizumab perioperative muscle-invasive bladder'},{t:'KEYNOTE-B15 / EV-304: cisplatin-eligible MIBC, positive topline 2026',q:'KEYNOTE-B15 EV-304 enfortumab vedotin pembrolizumab cisplatin-eligible muscle-invasive bladder'}],
  disease:'gu', name:'KEYNOTE-905 / EV-303: enfortumab vedotin + pembrolizumab, cystectomy, EV + pembrolizumab',
  trial:'KEYNOTE-905 / EV-303', summary:'Muscle-invasive bladder cancer, cisplatin-ineligible (or declining cisplatin). EV + pembrolizumab ×3, cystectomy, EV + pembrolizumab ×6, then pembrolizumab ×8.',
  title:'An antibody-drug medicine with immunotherapy before bladder surgery, then continued after',
  subtitle:'Muscle-invasive bladder cancer (stage II to IIIA), when cisplatin is not an option',
  nodes:[
    P({ name:'Enfortumab vedotin (Padcev) + pembrolizumab (Keytruda)', short:'Enfortumab + pembrolizumab', mods:['targeted','io'], cycleDays:21, cycles:3,
        visits:[{d:1,label:'Enfortumab vedotin and pembrolizumab'},{d:8,label:'Enfortumab vedotin'}],
        plain:'Enfortumab vedotin is an antibody that finds bladder cancer cells and delivers chemotherapy directly into them, given by IV on days 1 and 8 of each 3-week cycle. Pembrolizumab is immunotherapy, given on day 1. Three cycles before surgery.' }),
    R('Recovery before surgery', 5, 'About 4 to 6 weeks to recover, with scans and surgical planning.'),
    S('Surgery (radical cystectomy)', 'Removal of the bladder with nearby lymph nodes, and creation of a new way for urine to leave the body (a urinary diversion). Recovery takes several weeks.'),
    R('Healing after surgery', 8, 'Recovery from surgery, usually 6 to 10 weeks before treatment restarts.'),
    P({ name:'Enfortumab vedotin + pembrolizumab', short:'Enfortumab + pembrolizumab', mods:['targeted','io'], cycleDays:21, cycles:6,
        visits:[{d:1,label:'Enfortumab vedotin and pembrolizumab'},{d:8,label:'Enfortumab vedotin'}],
        plain:'The same combination continues after surgery for 6 cycles (about 4 months).' }),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:8,
        plain:'Immunotherapy on its own every 3 weeks for 8 more doses, to complete about one year of pembrolizumab in total. Each visit is short.' }),
  ]
},
{
  id:'imvigor011', plan:'Bladder surgery, then a blood test decides the next step', group:'Bladder', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Powles T et al. ctDNA-guided adjuvant atezolizumab in muscle-invasive bladder cancer (IMvigor011). NEJM 2025',q:'IMvigor011 ctDNA-guided adjuvant atezolizumab muscle-invasive bladder NEJM 2025'},{t:'FDA approval of adjuvant atezolizumab for ctDNA MRD-positive MIBC with Signatera CDx, May 15, 2026',q:'atezolizumab adjuvant muscle invasive bladder cancer molecular residual disease FDA 2026'}],
  disease:'gu', name:'IMvigor011: cystectomy, ctDNA testing, atezolizumab if ctDNA-positive',
  trial:'IMvigor011', summary:'Muscle-invasive bladder cancer after cystectomy. Serial ctDNA (Signatera) for a year; atezolizumab ×12 if ctDNA is detected, surveillance if not.',
  title:'Chemotherapy and bladder surgery, then a blood test for leftover cancer DNA guides whether immunotherapy is needed',
  subtitle:'Muscle-invasive bladder cancer after bladder surgery',
  nodes:[
    P({ name:'Cisplatin-based chemotherapy before surgery (if given)', short:'Gem/cis chemo', mods:['chemo'], cycleDays:21, cycles:4, optional:true, on:true,
        visits:[{d:1,label:'Cisplatin and gemcitabine'},{d:8,label:'Gemcitabine'}],
        plain:'Many people receive chemotherapy (or chemotherapy with immunotherapy) before surgery to shrink the cancer. This step can be removed if surgery comes first.' }),
    R('Recovery before surgery', 5, 'About 4 to 6 weeks to recover, with scans and surgical planning.'),
    S('Surgery (radical cystectomy)', 'Removal of the bladder with nearby lymph nodes, and creation of a new way for urine to leave the body (a urinary diversion).'),
    R('Healing and first blood test', 8, 'Recovery from surgery. Starting about 6 weeks after the operation, a blood test looks for tiny amounts of cancer DNA (ctDNA). It is repeated over the following year.'),
    D({ name:'ctDNA blood test', short:'ctDNA test', question:'Was cancer DNA found in the blood?',
        plain:'A blood test can detect traces of cancer DNA before any scan would show a recurrence. If it is found, a year of immunotherapy lowers the chance of the cancer returning. If it is not found, no treatment is needed, and testing continues.',
        branches:[
          Br('No cancer DNA detected', [
            P({ name:'Surveillance with repeat ctDNA tests', short:'ctDNA surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Blood test every 6 to 12 weeks for a year, with scans',
                plain:'No treatment for now. The blood test is repeated every 6 to 12 weeks for a year, alongside scans. If cancer DNA appears later, immunotherapy can start then.' }),
          ]),
          Br('Cancer DNA detected', [
            P({ name:'Atezolizumab (Tecentriq)', short:'Atezolizumab', mods:['io'], cycleDays:28, cycles:12,
                plain:'Immunotherapy by IV every 4 weeks for up to 12 doses (one year). A version given as an injection under the skin is also available. It helps your immune system find and destroy the remaining cancer cells.' }),
          ]),
        ] }),
  ]
},
{
  id:'cm274', plan:'Chemo, bladder surgery, then immunotherapy', group:'Bladder', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Bajorin DF et al. CheckMate 274: adjuvant nivolumab (240 mg every 2 weeks in the trial). NEJM 2021',q:'CheckMate 274 adjuvant nivolumab urothelial Bajorin NEJM 2021'},{t:'Grossman HB et al. SWOG 8710: neoadjuvant MVAC ×3 established chemotherapy before cystectomy; gemcitabine–cisplatin ×4 is the common modern substitute. NEJM 2003',q:'SWOG 8710 neoadjuvant chemotherapy cystectomy Grossman NEJM 2003'},{t:'FDA labeling: nivolumab (Opdivo) 480 mg every 4 weeks adjuvant dosing option',q:'FDA nivolumab Opdivo 480 mg every 4 weeks adjuvant urothelial label'}],
  disease:'gu', name:'Chemo, cystectomy, adjuvant nivolumab (CheckMate 274)',
  trial:'SWOG 8710 / CheckMate 274', summary:'Muscle-invasive bladder cancer. Cisplatin-based chemo ×4, cystectomy, nivolumab for up to 1 year if high-risk pathology.',
  title:'Chemotherapy before bladder surgery, then immunotherapy after if the pathology is high risk',
  subtitle:'Muscle-invasive bladder cancer (stage II to IIIA)',
  nodes:[
    P({ name:'Gemcitabine + cisplatin (or dose-dense MVAC)', short:'Gem/cis chemo', mods:['chemo'], cycleDays:21, cycles:4,
        visits:[{d:1,label:'Cisplatin and gemcitabine'},{d:8,label:'Gemcitabine'}],
        plain:'Cisplatin-based chemotherapy every 3 weeks, 4 times, to shrink the cancer before surgery. Dose-dense MVAC (every 2 weeks) is an alternative.' }),
    R('Recovery before surgery', 5, 'About 4 to 6 weeks to recover, with scans and surgical planning.'),
    S('Surgery (radical cystectomy)', 'Removal of the bladder with nearby lymph nodes, and creation of a urinary diversion.'),
    R('Healing after surgery', 8, 'Recovery from surgery. If immunotherapy is recommended, it starts within about 4 months.'),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'If cancer had grown through the bladder wall or into lymph nodes despite chemotherapy, a year of immunotherapy lowers the chance of it coming back.',
        branches:[
          Br('Little or no cancer remained', [
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Scans every 3 to 6 months', plain:'No further treatment. Scans and visits on a regular schedule.' }),
          ]),
          Br('High-risk cancer remained', [
            P({ name:'Nivolumab (Opdivo)', short:'Nivolumab', mods:['io'], cycleDays:28, cycles:13, plain:'Immunotherapy by IV every 2 or 4 weeks for up to one year. Pembrolizumab is an alternative.' }),
          ]),
        ] }),
  ]
},
{
  id:'trimodality', plan:'Bladder-preserving chemoradiation', group:'Bladder', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'James ND et al. BC2001: chemoradiotherapy for bladder cancer. NEJM 2012 (radiotherapy 64 Gy in 32 fractions over 6.5 weeks, or 55 Gy in 20 fractions over 4 weeks)',q:'BC2001 radiotherapy chemoradiotherapy bladder cancer James NEJM 2012'},{t:'Choudhury A et al. BC2001/BCON meta-analysis: 55 Gy in 20 fractions noninferior and superior for invasive locoregional control. Lancet Oncol 2021',q:'hypofractionated radiotherapy bladder cancer BC2001 BCON meta-analysis Choudhury Lancet Oncology 2021'}],
  disease:'gu', name:'Trimodality bladder preservation: TURBT, chemoradiation, surveillance',
  trial:'BC2001 / NCCN', summary:'Muscle-invasive bladder cancer, bladder preservation. Maximal TURBT, chemoradiation over 4 weeks (55 Gy/20) or 6.5 weeks (64 Gy/32), cystoscopic surveillance.',
  title:'Removing the tumor through a scope, then chemoradiation to keep your bladder',
  subtitle:'Muscle-invasive bladder cancer (stage II to IIIA), bladder-preserving approach',
  nodes:[
    S('Scope surgery to remove the visible tumor (TURBT)', 'The tumor is removed through the urethra with a scope, without any incision. This is done as completely as possible before radiation.'),
    R('Recovery', 3, 'A few weeks to heal before radiation begins.'),
    P({ name:'Chemoradiation', short:'Radiation + chemo', mods:['radiation','chemo'], mode:'weekdays', weeks:'',
        plain:'Radiation to the bladder every weekday, with low-dose chemotherapy (cisplatin, or 5-FU with mitomycin) to make the radiation more effective. The course is either about 4 weeks or about 6 and a half weeks; your radiation team sets the schedule.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Scope checks every 3 months at first, plus scans',
        plain:'Scope checks of the bladder every 3 months at first, then less often, with scans. If the cancer returns, surgery to remove the bladder remains an option.' }),
  ]
},
{
  id:'kn564', plan:'Kidney surgery, then immunotherapy', group:'Kidney', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Choueiri TK et al. KEYNOTE-564: adjuvant pembrolizumab. NEJM 2021',q:'KEYNOTE-564 adjuvant pembrolizumab renal cell Choueiri NEJM 2021'},{t:'Choueiri TK et al. KEYNOTE-564 overall survival. NEJM 2024',q:'KEYNOTE-564 overall survival adjuvant pembrolizumab NEJM 2024'}],
  disease:'gu', name:'KEYNOTE-564: nephrectomy, then pembrolizumab for a year',
  trial:'KEYNOTE-564', summary:'Clear-cell kidney cancer at higher risk of recurrence after surgery. Nephrectomy, pembrolizumab every 3 weeks ×17.',
  title:'Kidney surgery, then a year of immunotherapy',
  subtitle:'Kidney cancer (clear-cell type) at higher risk of returning after surgery',
  nodes:[
    S('Surgery (nephrectomy)', 'Removal of the affected kidney, or the part of it containing the cancer.'),
    R('Healing after surgery', 8, 'Recovery from surgery. Immunotherapy starts within 12 weeks of the operation.'),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:17, plain:'Immunotherapy by IV every 3 weeks for 17 doses (about one year). It helps your immune system find and destroy any remaining cancer cells.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Scans every 6 months', plain:'Regular visits and CT scans after immunotherapy is finished.' }),
  ]
},
{
  id:'kidney-surv', plan:'Kidney surgery, then surveillance', group:'Kidney', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'NCCN Guidelines: Kidney Cancer (surveillance after nephrectomy)',q:'NCCN kidney cancer surveillance after nephrectomy'}],
  disease:'gu', name:'Nephrectomy, then surveillance',
  trial:'NCCN standard', summary:'Kidney cancer at lower risk of recurrence. Partial or radical nephrectomy, then scans on a schedule. No drug treatment.',
  title:'Kidney surgery, then regular scans',
  subtitle:'Kidney cancer, stage I to II',
  nodes:[
    S('Surgery (partial or radical nephrectomy)', 'Removal of the part of the kidney containing the cancer, or the whole kidney.'),
    R('Healing after surgery', 6, 'Recovery from surgery.'),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:260, openEnded:true, freqText:'Scans every 6 to 12 months',
        plain:'No further treatment is needed. Blood tests and scans every 6 to 12 months for 5 years to make sure the cancer has not returned.' }),
  ]
},
{
  id:'prostate-long', plan:'Radiation with long-course hormone therapy', group:'Prostate', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Bolla M et al. EORTC 22961: 3 years vs 6 months of ADT with radiation. NEJM 2009',q:'EORTC 22961 duration androgen suppression radiotherapy Bolla NEJM 2009'},{t:'Attard G et al. STAMPEDE: abiraterone for high-risk non-metastatic prostate cancer. Lancet 2022',q:'STAMPEDE abiraterone high-risk non-metastatic prostate Attard Lancet 2022'}],
  disease:'gu', name:'Radiation + 2–3 years of ADT (± abiraterone)',
  trial:'EORTC 22961 / STAMPEDE', summary:'High-risk localized prostate cancer. Hormone therapy (ADT) for 2–3 years with radiation; abiraterone for 2 years in very high-risk disease.',
  title:'Hormone therapy for two to three years, with radiation to the prostate',
  subtitle:'Prostate cancer, high risk (localized)',
  nodes:[
    P({ name:'Hormone therapy begins (ADT injection)', short:'Hormone therapy', mods:['endocrine'], cycleDays:84, cycles:1,
        visits:[{d:1,label:'ADT injection (lasts 3 months)'}],
        plain:'An injection that lowers testosterone, the hormone prostate cancer feeds on. It usually starts 2 to 3 months before radiation and is repeated every 3 or 6 months.' }),
    P({ name:'Radiation to the prostate', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:'',
        plain:'Daily radiation, Monday to Friday. Your radiation oncologist sets the number of sessions, from as few as 5 to as many as 39 depending on the technique.' }),
    P({ name:'Hormone therapy continues', short:'Hormone therapy', mods:['endocrine'], cycleDays:84, cycles:11,
        visits:[{d:1,label:'ADT injection'}],
        plain:'Injections continue every 3 or 6 months to complete 2 to 3 years in total. Hot flashes, tiredness, and loss of muscle are common and manageable.' }),
    P({ name:'Abiraterone + prednisone tablets (very high risk)', short:'Abiraterone', mods:['endocrine'], mode:'daily', weeks:104, optional:true, on:false, concurrent:true,
        plain:'For very high-risk cancers, abiraterone tablets with low-dose prednisone every day for 2 years alongside the injections (STAMPEDE).' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:260, openEnded:true, freqText:'PSA blood test every 3 to 6 months', plain:'A PSA blood test every 3 to 6 months, then yearly.' }),
  ]
},
{
  id:'prostate-short', plan:'Radiation with short-course hormone therapy', group:'Prostate', added:'2026-08-31', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Jones CU et al. RTOG 94-08: 4 months of ADT with radiation, started 2 months before. NEJM 2011',q:'RTOG 9408 short-term androgen deprivation radiotherapy Jones NEJM 2011'}],
  disease:'gu', name:'Radiation + 4 months of ADT',
  trial:'RTOG 94-08', summary:'Intermediate-risk localized prostate cancer. Hormone therapy for 4 months total: 2 months before radiation, then 2 months during it. None after radiation.',
  title:'A few months of hormone therapy, with radiation to the prostate',
  subtitle:'Prostate cancer, intermediate risk (localized)',
  nodes:[
    P({ name:'Hormone therapy begins (ADT injection)', short:'Hormone therapy', mods:['endocrine'], cycleDays:56, cycles:1,
        visits:[{d:1,label:'ADT injection'}],
        plain:'An injection that lowers testosterone, the hormone prostate cancer feeds on. Radiation starts about 2 months later.' }),
    P({ name:'Radiation to the prostate', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:'',
        plain:'Daily radiation, Monday to Friday. Your radiation oncologist sets the number of sessions, from 5 to 28 depending on the technique.' }),
    P({ name:'Hormone therapy continues during radiation', short:'Hormone therapy', mods:['endocrine'], cycleDays:56, cycles:1, concurrent:true,
        visits:[{d:1,label:'ADT injection'}],
        plain:'Hormone therapy continues while radiation is given and finishes with it, for about 4 months in total. Testosterone recovers over the following months.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:260, openEnded:true, freqText:'PSA blood test every 6 months', plain:'A PSA blood test every 6 months, then yearly.' }),
  ]
},
{
  id:'prostatectomy', plan:'Prostate surgery, then surveillance', group:'Prostate', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Hamdy FC et al. ProtecT: 15-year outcomes. NEJM 2023',q:'ProtecT 15-year outcomes prostatectomy radiotherapy monitoring Hamdy NEJM 2023'},{t:'Vale CL et al. ARTISTIC meta-analysis: adjuvant vs early salvage radiotherapy. Lancet 2020',q:'ARTISTIC adjuvant early salvage radiotherapy prostatectomy Vale Lancet 2020'}],
  disease:'gu', name:'Radical prostatectomy, PSA surveillance, radiation only if PSA rises',
  trial:'ProtecT / ARTISTIC', summary:'Localized prostate cancer. Surgery, then PSA monitoring; early salvage radiation (with or without ADT) if PSA rises.',
  title:'Surgery to remove the prostate, then PSA checks, with radiation only if needed',
  subtitle:'Prostate cancer, localized',
  nodes:[
    S('Surgery (radical prostatectomy)', 'Removal of the prostate and, when needed, nearby lymph nodes, usually with robotic assistance.'),
    R('Healing after surgery', 6, 'Recovery, including regaining bladder control. The first PSA check is at about 6 to 8 weeks.'),
    P({ name:'PSA surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:260, openEnded:true, freqText:'PSA blood test every 3 to 6 months',
        plain:'After surgery the PSA should be undetectable. It is checked every 3 to 6 months for the first years, then yearly.' }),
    P({ name:'Radiation if the PSA rises (salvage)', short:'Radiation if needed', mods:['radiation'], mode:'weekdays', weeks:'', optional:true, on:false,
        plain:'If the PSA rises, radiation to the area where the prostate was, sometimes with a few months of hormone therapy, can still cure the cancer.' }),
  ]
},
{
  id:'active-surv', plan:'Active surveillance', group:'Prostate', added:'2026-08-31', reviewed:'2026-08-31', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Hamdy FC et al. ProtecT: active monitoring vs surgery vs radiotherapy. NEJM 2016',q:'ProtecT active monitoring surgery radiotherapy localised prostate Hamdy NEJM 2016'}],
  disease:'gu', name:'Active surveillance (low-risk prostate cancer)',
  trial:'ProtecT / NCCN', summary:'Low-risk localized prostate cancer. No treatment now; PSA, MRI, and repeat biopsies on a schedule, with treatment if the cancer changes.',
  title:'Careful monitoring instead of treatment, with treatment only if the cancer changes',
  subtitle:'Prostate cancer, low risk (localized)',
  nodes:[
    P({ name:'Active surveillance', short:'Active surveillance', mods:['watch'], mode:'ongoing', weeks:260, openEnded:true, freqText:'PSA every 6 months; MRI and biopsy at set intervals',
        plain:'Low-risk prostate cancer often never needs treatment. A PSA blood test every 6 months, an MRI every 1 to 2 years, and a repeat biopsy at set intervals watch for change. If the cancer becomes more active, surgery or radiation is offered then, with the same chance of cure.' }),
  ]
},
/* ---------- GI (additions) ---------- */
{
  id:'atomic', plan:'Chemotherapy with immunotherapy after colon surgery', group:'Colon', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Sinicrope FA et al. ATOMIC (Alliance A021502): atezolizumab + mFOLFOX6 for stage III dMMR colon cancer. NEJM 2026',q:'ATOMIC Alliance A021502 atezolizumab FOLFOX stage III mismatch repair deficient colon NEJM'},{t:'FDA priority review of adjuvant atezolizumab + chemotherapy for stage III dMMR colon cancer; decision expected October 9, 2026',q:'atezolizumab adjuvant stage III dMMR MSI-H colon cancer priority review 2026'}],
  disease:'gi', name:'ATOMIC: surgery, FOLFOX + atezolizumab, then atezolizumab (dMMR / MSI-high, stage III)',
  trial:'ATOMIC (NCCN-listed; FDA decision expected October 2026)', summary:'Stage III colon cancer with mismatch-repair deficiency (dMMR / MSI-high). Surgery, mFOLFOX6 ×12 with atezolizumab, then atezolizumab alone ×13.',
  title:'Surgery, then six months of chemotherapy with immunotherapy, then six more months of immunotherapy alone',
  subtitle:'Colon cancer, stage III, with mismatch-repair deficiency (dMMR / MSI-high)',
  nodes:[
    S('Surgery (colectomy)', 'Removal of the section of colon containing the cancer, with nearby lymph nodes. Testing of the tumor shows it is mismatch-repair deficient, which makes it especially sensitive to immunotherapy.'),
    R('Healing after surgery', 5, 'Recovery from surgery. Treatment usually starts within 6 to 8 weeks of the operation.'),
    P({ name:'mFOLFOX6 chemotherapy', short:'FOLFOX', mods:['chemo'], cycleDays:14, cycles:12,
        visits:[{d:1,label:'Oxaliplatin and leucovorin, then a 5-FU pump for about 46 hours'}],
        plain:'Two chemotherapy drugs (oxaliplatin and 5-FU) every 2 weeks for 6 months. One of them runs through a small pump you wear home for about 2 days.' }),
    P({ name:'Atezolizumab (Tecentriq)', short:'Atezolizumab', mods:['io'], cycleDays:14, cycles:12, concurrent:true,
        plain:'Immunotherapy by IV every 2 weeks, given on the same days as chemotherapy. It helps your immune system recognize and attack cancer cells, which works particularly well in mismatch-repair-deficient cancers.' }),
    P({ name:'Atezolizumab (Tecentriq) alone', short:'Atezolizumab alone', mods:['io'], cycleDays:14, cycles:13,
        plain:'Immunotherapy continues on its own every 2 weeks for 6 more months, to complete one year in total. Each visit is short.' }),
    P({ name:'Monitoring (surveillance)', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:52, openEnded:true, freqText:'Blood test every 3 to 6 months, scan every 6 to 12 months',
        plain:'Regular check-ups: a blood test (CEA) every 3 to 6 months, a CT scan every 6 to 12 months, and a colonoscopy about one year after surgery.' }),
  ]
},
{
  id:'anal', plan:'Chemoradiation, then surgery only if needed', group:'Anal canal', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'James RD et al. ACT II: mitomycin or cisplatin chemoradiation with or without maintenance chemotherapy for anal cancer. Lancet Oncology 2013',q:'ACT II anal cancer mitomycin cisplatin chemoradiation James Lancet Oncology 2013'},{t:'Ajani JA et al. RTOG 98-11: fluorouracil, mitomycin, and radiotherapy vs fluorouracil, cisplatin, and radiotherapy. JAMA 2008',q:'RTOG 98-11 anal canal carcinoma fluorouracil mitomycin radiotherapy Ajani JAMA 2008'}],
  disease:'gi', name:'Anal canal: chemoradiation, response assessment, salvage surgery only if needed',
  trial:'ACT II / RTOG 98-11', summary:'Squamous cell cancer of the anal canal. Chemoradiation with mitomycin and 5-FU (or capecitabine), response checks up to 26 weeks, surgery only if cancer persists.',
  title:'Chemotherapy with radiation to cure the cancer without surgery, with checks afterward',
  subtitle:'Squamous cell cancer of the anal canal, stage I to III',
  nodes:[
    P({ name:'Chemoradiation (mitomycin + 5-FU or capecitabine)', short:'Radiation + mitomycin/5-FU', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation every weekday for about 5 to 6 weeks, with chemotherapy that makes it more effective: mitomycin by IV on the first day (and sometimes day 29), plus 5-FU by pump during the first and last weeks, or capecitabine tablets on radiation days. This treatment cures most anal cancers without surgery.' }),
    R('Healing and response checks', 20, 'The cancer keeps shrinking for months after radiation ends. Exams at about 11, 18, and 26 weeks after treatment check the response; a complete response can take the full 26 weeks.'),
    D({ name:'Response at 26 weeks', short:'Response check', question:'Has the cancer completely disappeared?',
        plain:'Most people have a complete response and need no further treatment. If cancer remains or regrows, surgery can still cure it.',
        branches:[
          Br('Complete response', [
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:156, openEnded:true, freqText:'Exam every 3 to 6 months for 5 years',
                plain:'Exams every 3 to 6 months for 5 years, with scans in the first years. No further treatment.' }),
          ]),
          Br('Cancer remains', [
            S('Surgery (abdominoperineal resection)', 'Removal of the anus and rectum with a permanent colostomy. This surgery is reserved for the minority whose cancer does not respond fully, and it can still be curative.'),
            R('Healing after surgery', 8, 'Recovery from surgery, followed by regular monitoring.'),
          ]),
        ] }),
  ]
},

/* ---------- HEAD AND NECK ---------- */
{
  id:'hn-crt', plan:'Chemoradiation to cure without surgery', group:'Oral cavity, throat, and larynx', added:'2026-09-01', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Adelstein DJ et al. Intergroup phase III: radiation (70 Gy in 35 fractions) with concurrent cisplatin days 1, 22, 43. JCO 2003',q:'Adelstein intergroup phase III cisplatin radiotherapy unresectable head neck JCO 2003'},{t:'Pignon JP et al. MACH-NC meta-analysis: chemotherapy in head and neck cancer. Radiotherapy and Oncology 2009',q:'MACH-NC meta-analysis chemotherapy head and neck cancer Pignon Radiotherapy Oncology 2009'},{t:'Noronha V et al. Once-a-week vs once-every-3-weeks cisplatin chemoradiation (largely adjuvant setting). JCO 2018',q:'once-a-week versus once-every-3-weeks cisplatin chemoradiation head neck Noronha JCO 2018'}],
  disease:'hn', name:'Definitive chemoradiation: cisplatin + radiation (7 weeks)',
  trial:'MACH-NC / NCCN standard', summary:'Locally advanced squamous cell cancer of the oropharynx, larynx, hypopharynx, or oral cavity treated without surgery. Cisplatin every 3 weeks ×3 (or weekly) with 7 weeks of radiation.',
  title:'Seven weeks of daily radiation with cisplatin, aiming to cure the cancer and keep your voice and swallowing',
  subtitle:'Head and neck squamous cell cancer, stage III to IVA',
  nodes:[
    P({ name:'Radiation with cisplatin (chemoradiation)', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:7,
        plain:'Radiation to the tumor and neck every weekday for about 7 weeks (35 sessions), with cisplatin by IV every 3 weeks (3 doses) or weekly to make the radiation more effective. A dental check, nutrition plan, and sometimes a feeding tube are arranged before starting.' }),
    R('Recovery and first scan', 12, 'Side effects in the mouth and throat peak in the last weeks and take 2 to 3 months to settle. A PET/CT scan about 12 weeks after treatment checks the response.'),
    D({ name:'Scan at 12 weeks', short:'Scan', question:'What did the scan show?',
        plain:'Most people have a complete response. If lymph nodes in the neck have not fully responded, a neck operation removes what remains.',
        branches:[
          Br('Complete response', [
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams every 2 to 3 months in the first year, then less often',
                plain:'Regular exams, swallowing and speech support, thyroid blood tests, and dental care. No further treatment.' }),
          ]),
          Br('Lymph nodes remain', [
            S('Neck surgery (neck dissection)', 'Removal of the lymph nodes in the neck that did not fully respond.'),
            R('Healing after surgery', 6, 'Recovery from surgery, followed by regular monitoring.'),
          ]),
        ] }),
  ]
},
{
  id:'hn-postop', plan:'Surgery, then radiation based on the pathology', group:'Oral cavity, throat, and larynx', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Bernier J et al. EORTC 22931: postoperative chemoradiation. NEJM 2004',q:'EORTC 22931 postoperative irradiation cisplatin head neck Bernier NEJM 2004'},{t:'Cooper JS et al. RTOG 9501: postoperative concurrent radiotherapy and chemotherapy. NEJM 2004',q:'RTOG 9501 postoperative concurrent radiotherapy chemotherapy head neck Cooper NEJM 2004'}],
  disease:'hn', name:'Surgery, then radiation with or without cisplatin (pathology-guided)',
  trial:'RTOG 9501 / EORTC 22931', summary:'Resectable head and neck squamous cell cancer. Surgery, then radiation alone or with cisplatin depending on margins and extranodal extension.',
  title:'Surgery first, then radiation, with cisplatin added if the pathology shows higher-risk features',
  subtitle:'Head and neck squamous cell cancer, stage III to IVA (operable)',
  nodes:[
    S('Surgery', 'Removal of the tumor with nearby lymph nodes in the neck; reconstruction if needed.'),
    R('Healing after surgery', 5, 'Recovery, usually 4 to 6 weeks. Radiation is planned to start within 6 weeks of surgery.'),
    D({ name:'Pathology results', short:'Results', question:'What did the pathology report show?',
        plain:'Two findings decide whether cisplatin is added to radiation: cancer at the edge of the removed tissue (a positive margin) or cancer growing outside a lymph node (extranodal extension).',
        branches:[
          Br('Positive margins or extranodal extension', [
            P({ name:'Radiation with cisplatin', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
                plain:'Radiation every weekday for about 6 weeks with cisplatin by IV every 3 weeks (or weekly), which lowers the chance of the cancer returning.' }),
          ]),
          Br('Other risk features', [
            P({ name:'Radiation alone', short:'Radiation', mods:['radiation'], mode:'weekdays', weeks:6,
                plain:'Radiation every weekday for about 6 weeks, without chemotherapy.' }),
          ]),
        ] }),
  ]
},
{
  id:'kn689', plan:'Immunotherapy before and after surgery, with radiation', group:'Oral cavity, throat, and larynx', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Uppaluri R et al. KEYNOTE-689: neoadjuvant and adjuvant pembrolizumab in resectable locally advanced HNSCC. NEJM 2025',q:'KEYNOTE-689 neoadjuvant adjuvant pembrolizumab resectable head neck squamous Uppaluri'},{t:'FDA approval of perioperative pembrolizumab for resectable locally advanced HNSCC (PD-L1 CPS ≥1), June 12, 2025',q:'FDA approves pembrolizumab neoadjuvant adjuvant resectable head and neck squamous cell carcinoma 2025'}],
  disease:'hn', name:'KEYNOTE-689: pembrolizumab, surgery, pembrolizumab + radiation (± cisplatin), pembrolizumab',
  trial:'KEYNOTE-689', summary:'Resectable locally advanced HNSCC with PD-L1 CPS ≥1. Pembrolizumab ×2, surgery, pembrolizumab ×3 with radiation ± cisplatin, then pembrolizumab ×12.',
  title:'Immunotherapy before surgery, then immunotherapy with radiation after, then immunotherapy alone',
  subtitle:'Head and neck squamous cell cancer, stage III to IVA (operable), PD-L1 positive',
  nodes:[
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:2,
        plain:'Immunotherapy by IV every 3 weeks, 2 doses, before surgery. It helps your immune system recognize and attack cancer cells while the tumor is still present, which appears to make the immune response stronger.' }),
    R('Recovery before surgery', 3, 'Surgery is planned within about 6 weeks of the first dose.'),
    S('Surgery', 'Removal of the tumor with nearby lymph nodes in the neck; reconstruction if needed.'),
    R('Healing after surgery', 5, 'Recovery, usually 4 to 6 weeks, before radiation starts.'),
    P({ name:'Pembrolizumab with radiation (cisplatin added for higher-risk pathology)', short:'Pembrolizumab + radiation', mods:['io','radiation'], cycleDays:21, cycles:3,
        plain:'Radiation every weekday for about 6 weeks, with pembrolizumab every 3 weeks (3 doses) continuing through it. Cisplatin is added if the pathology showed positive margins or cancer growing outside a lymph node.' }),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:12,
        plain:'Immunotherapy on its own every 3 weeks for 12 more doses (about 9 months), to complete a year in total. Each visit is short.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams every 2 to 3 months in the first year, then less often',
        plain:'Regular exams, swallowing and speech support, thyroid blood tests, and dental care.' }),
  ]
},
{
  id:'npc', plan:'Chemotherapy first, then chemoradiation', group:'Nasopharynx', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Zhang Y et al. Gemcitabine and cisplatin induction chemotherapy in nasopharyngeal carcinoma. NEJM 2019',q:'gemcitabine cisplatin induction chemotherapy nasopharyngeal carcinoma Zhang NEJM 2019'}],
  disease:'hn', name:'Nasopharyngeal cancer: gemcitabine/cisplatin ×3, then cisplatin + radiation',
  trial:'Zhang et al. (NEJM 2019) / NCCN', summary:'Locally advanced nasopharyngeal carcinoma. Induction gemcitabine + cisplatin ×3, then concurrent cisplatin with 7 weeks of radiation.',
  title:'Three cycles of chemotherapy first, then seven weeks of radiation with cisplatin',
  subtitle:'Nasopharyngeal cancer, stage III to IVA',
  nodes:[
    P({ name:'Gemcitabine + cisplatin (induction)', short:'Gem/cis chemo', mods:['chemo'], cycleDays:21, cycles:3,
        visits:[{d:1,label:'Gemcitabine and cisplatin'},{d:8,label:'Gemcitabine'}],
        plain:'Two chemotherapy drugs every 3 weeks, 3 times, to shrink the cancer before radiation. Gemcitabine is given on days 1 and 8 of each cycle, cisplatin on day 1.' }),
    P({ name:'Radiation with cisplatin (chemoradiation)', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:7,
        plain:'Radiation to the nasopharynx and neck every weekday for about 7 weeks, with cisplatin every 3 weeks (3 doses) to make it more effective.' }),
    R('Recovery and first scan', 12, 'Side effects take 2 to 3 months to settle. An MRI or PET/CT about 12 weeks after treatment checks the response.'),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams and EBV blood tests every 3 months in the first year',
        plain:'Regular exams, scopes, and Epstein-Barr virus DNA blood tests, with hearing and thyroid checks.' }),
  ]
},

/* ---------- MELANOMA ---------- */
{
  id:'nadina', plan:'Immunotherapy before surgery, then only if needed after', group:'Stage III (lymph node involvement)', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Blank CU et al. NADINA: neoadjuvant nivolumab and ipilimumab in resectable stage III melanoma. NEJM 2024',q:'NADINA neoadjuvant nivolumab ipilimumab resectable stage III melanoma Blank NEJM 2024'}],
  disease:'skin', name:'NADINA: ipilimumab + nivolumab ×2, surgery, adjuvant therapy only without a major response',
  trial:'NADINA (NCCN-listed)', summary:'Macroscopic stage III melanoma. Ipilimumab + nivolumab ×2, lymph node dissection, then no further treatment if a major pathologic response, or nivolumab (or dabrafenib + trametinib) for a year if not.',
  title:'Two doses of combination immunotherapy, then surgery, then more treatment only if the pathology calls for it',
  subtitle:'Melanoma, stage III with lymph node involvement (operable)',
  nodes:[
    P({ name:'Ipilimumab (Yervoy) + nivolumab (Opdivo)', short:'Ipilimumab + nivolumab', mods:['io'], cycleDays:21, cycles:2,
        plain:'Two immunotherapy drugs by IV every 3 weeks, 2 doses, before surgery. Given while the tumor is still present, the immune response is stronger than the same drugs given after surgery.' }),
    R('Recovery before surgery', 3, 'Surgery is planned about 6 weeks after the first dose.'),
    S('Surgery (lymph node dissection)', 'Removal of the involved lymph nodes. The pathologist measures how much living cancer remains, which decides the next step.'),
    R('Healing after surgery', 4, 'Recovery while the pathology is reviewed.'),
    D({ name:'Pathology response', short:'Results', question:'How much living cancer remained?',
        plain:'About 6 in 10 people have a major response (10 percent or less living cancer) and need no further treatment. Others receive a year of treatment after surgery.',
        branches:[
          Br('Major response (10 percent or less living cancer)', [
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams and scans every 3 to 4 months at first',
                plain:'No further treatment. Skin and lymph node exams with scans every 3 to 4 months for the first 2 years, then less often.' }),
          ]),
          Br('Less than a major response', [
            P({ name:'Nivolumab (Opdivo)', short:'Nivolumab', mods:['io'], cycleDays:28, cycles:11,
                plain:'Immunotherapy on its own every 4 weeks for 11 doses (about 10 months), to complete about one year of treatment. If the melanoma has a BRAF mutation, dabrafenib + trametinib tablets for 46 weeks are the alternative.' }),
          ]),
        ] }),
  ]
},
{
  id:'s1801', plan:'Immunotherapy before and after surgery', group:'Stage III (lymph node involvement)', added:'2026-09-01', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Patel SP et al. SWOG S1801: neoadjuvant-adjuvant or adjuvant-only pembrolizumab in advanced melanoma. NEJM 2023',q:'SWOG S1801 neoadjuvant adjuvant pembrolizumab melanoma Patel NEJM 2023'}],
  disease:'skin', name:'SWOG S1801: pembrolizumab ×3, surgery, pembrolizumab ×15',
  trial:'SWOG S1801', summary:'Resectable stage IIIB–IV melanoma. Pembrolizumab ×3 before surgery, then ×15 after, for 18 doses in total.',
  title:'Three doses of immunotherapy before surgery, then the rest of the year after',
  subtitle:'Melanoma, stage IIIB to IV (operable)',
  nodes:[
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:3,
        plain:'Immunotherapy by IV every 3 weeks, 3 doses, before surgery. Starting before surgery, while the tumor is present, improves the chance the cancer never returns compared with the same drug given only afterward.' }),
    R('Recovery before surgery', 3, 'Surgery follows about 3 weeks after the third dose.'),
    S('Surgery', 'Removal of the melanoma and involved lymph nodes.'),
    R('Healing after surgery', 4, 'Recovery before immunotherapy resumes.'),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:15,
        plain:'Immunotherapy continues every 3 weeks for 15 more doses, completing 18 in total (about one year).' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams and scans every 3 to 6 months', plain:'Skin and lymph node exams with scans every 3 to 6 months for the first years.' }),
  ]
},
{
  id:'mel-adj-io', plan:'Surgery, then a year of immunotherapy', group:'Stage II to III, after surgery', added:'2026-09-01', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Eggermont AMM et al. KEYNOTE-054: adjuvant pembrolizumab in stage III melanoma (18 doses every 3 weeks). NEJM 2018',q:'KEYNOTE-054 adjuvant pembrolizumab stage III melanoma Eggermont NEJM 2018'},{t:'Luke JJ et al. KEYNOTE-716: adjuvant pembrolizumab in stage IIB/IIC melanoma (17 cycles every 3 weeks). Lancet 2022',q:'KEYNOTE-716 adjuvant pembrolizumab stage IIB IIC melanoma Luke Lancet 2022'},{t:'Weber J et al. CheckMate 238: adjuvant nivolumab vs ipilimumab (nivolumab 3 mg/kg every 2 weeks for up to 1 year). NEJM 2017',q:'CheckMate 238 adjuvant nivolumab ipilimumab resected melanoma Weber NEJM 2017'},{t:'FDA labeling: nivolumab (Opdivo) 480 mg every 4 weeks adjuvant dosing option',q:'FDA nivolumab Opdivo 480 mg every 4 weeks adjuvant melanoma label'}],
  disease:'skin', name:'Surgery, then adjuvant pembrolizumab (or nivolumab) for one year',
  trial:'KEYNOTE-054 / KEYNOTE-716 / CheckMate 238', summary:'Resected stage IIB–III melanoma. Wide excision with lymph node surgery, then pembrolizumab every 3 weeks ×18 (stage III, KEYNOTE-054; ×17 for stage IIB/IIC, KEYNOTE-716), or nivolumab every 4 weeks ×12 (per current FDA label).',
  title:'Surgery to remove the melanoma, then a year of immunotherapy to lower the chance it returns',
  subtitle:'Melanoma, stage IIB to III, removed by surgery',
  nodes:[
    S('Surgery (wide excision with lymph node surgery)', 'Removal of the melanoma with a margin of healthy skin, plus a sentinel lymph node biopsy or removal of involved nodes.'),
    R('Healing after surgery', 6, 'Recovery from surgery. Immunotherapy usually starts within 12 weeks.'),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:21, cycles:18,
        plain:'Immunotherapy by IV every 3 weeks for about one year: 18 doses for stage III cancers, 17 for stage IIB or IIC. Nivolumab every 4 weeks for 12 doses is an equivalent option. It helps your immune system find and destroy any remaining melanoma cells.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Skin exams every 3 to 6 months, scans as advised', plain:'Skin and lymph node exams every 3 to 6 months, with scans for higher-stage disease.' }),
  ]
},
{
  id:'combiad', plan:'Surgery, then a year of targeted tablets', group:'Stage II to III, after surgery', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Long GV et al. COMBI-AD: adjuvant dabrafenib plus trametinib in stage III BRAF-mutated melanoma. NEJM 2017',q:'COMBI-AD adjuvant dabrafenib trametinib stage III BRAF melanoma Long NEJM 2017'}],
  disease:'skin', name:'Surgery, then dabrafenib + trametinib for one year (BRAF V600)',
  trial:'COMBI-AD', summary:'Resected stage III melanoma with a BRAF V600 mutation. Surgery, then dabrafenib + trametinib tablets for 12 months.',
  title:'Surgery to remove the melanoma, then a year of two targeted tablets',
  subtitle:'Melanoma, stage III, removed by surgery, with a BRAF V600 mutation',
  nodes:[
    S('Surgery (wide excision with lymph node surgery)', 'Removal of the melanoma with a margin of healthy skin, plus removal of involved lymph nodes.'),
    R('Healing after surgery', 6, 'Recovery from surgery. The tablets usually start within 12 weeks.'),
    P({ name:'Dabrafenib (Tafinlar) + trametinib (Mekinist)', short:'Dabrafenib + trametinib', mods:['targeted'], mode:'daily', weeks:52, freqText:'Tablets twice daily (dabrafenib) and once daily (trametinib); clinic visits monthly at first',
        plain:'Two targeted tablets taken at home for one year. They block the BRAF signal that drives this melanoma. Fevers are the most common side effect and are managed with short breaks in treatment.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Skin exams every 3 to 6 months, scans as advised', plain:'Skin and lymph node exams every 3 to 6 months, with scans for higher-stage disease.' }),
  ]
},
/* ---------- BREAST: genomic-assay pathway ---------- */
{
  id:'genomic', plan:'Surgery, then a gene test shows whether chemotherapy would be beneficial', group:'HR-positive, HER2-negative', added:'2026-09-01', reviewed:'2026-09-03', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Sparano JA et al. TAILORx: adjuvant chemotherapy guided by a 21-gene expression assay. NEJM 2018',q:'TAILORx 21-gene recurrence score adjuvant chemotherapy Sparano NEJM 2018'},{t:'Kalinsky K et al. RxPONDER: 21-gene assay in node-positive breast cancer. NEJM 2021',q:'RxPONDER 21-gene assay node-positive breast cancer Kalinsky NEJM 2021'},{t:'Cardoso F et al. MINDACT: 70-gene signature. NEJM 2016',q:'MINDACT 70-gene signature adjuvant chemotherapy Cardoso NEJM 2016'},{t:'Johnston SRD et al. monarchE: adjuvant abemaciclib. JCO 2020',q:'monarchE abemaciclib adjuvant Johnston'},{t:'Slamon D et al. NATALEE: adjuvant ribociclib. NEJM 2024',q:'NATALEE ribociclib early breast cancer Slamon NEJM 2024'}],
  disease:'breast', name:'Surgery, genomic test (Oncotype DX / MammaPrint), then chemotherapy only if the test shows benefit (choose TC or dose-dense AC-T)',
  trial:'TAILORx / RxPONDER / MINDACT', summary:'HR-positive, HER2-negative, stage I–II (node-negative or 1–3 nodes). Surgery, gene-expression test, then chemotherapy + radiation + endocrine therapy if the test shows chemotherapy is beneficial, or radiation + endocrine therapy if not. Both chemotherapy options are included; switch on the one your team uses. Optional adjuvant CDK4/6 inhibitor.',
  title:'Surgery first, then a test of the tumor\'s genes shows whether chemotherapy would be beneficial before radiation and hormone therapy',
  subtitle:'Hormone-receptor positive, HER2-negative breast cancer, stage I to II',
  nodes:[
    SURGERY_BREAST(),
    R('Healing and test results', 4, 'Recovery from surgery while the removed tumor is sent for a gene-expression test (Oncotype DX or MammaPrint). The result takes about 2 weeks.'),
    D({ name:'Genomic test result', short:'Gene test', question:'What did the gene-expression test show?',
        plain:'The test estimates how likely the cancer is to return and whether chemotherapy would be beneficial on top of hormone therapy. Your team will explain your number.',
        branches:[
          Br('Chemotherapy would be beneficial', [
            P({ name:'Chemotherapy (docetaxel + cyclophosphamide)', short:'Docetaxel + cyclophosphamide', mods:['chemo'], cycleDays:21, cycles:4, optional:true, on:true,
                plain:'Two chemotherapy drugs by IV every 3 weeks, 4 times (about 3 months), with a growth-factor injection after each dose. This is one of two common options; your team will say which suits your cancer.' }),
            P({ name:'Chemotherapy (dose-dense AC then paclitaxel)', short:'ddAC then paclitaxel', mods:['chemo'], cycleDays:14, cycles:8, optional:true, on:false,
                plain:'The other common option, often used for higher-risk cancers: doxorubicin and cyclophosphamide every 2 weeks, 4 times, then paclitaxel every 2 weeks, 4 times, or weekly for 12 weeks. A growth-factor injection follows each dose.' }),
            RADIATION_AFTER(true),
            P({ name:'Hormone (endocrine) therapy', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260,
                plain:'One tablet a day (tamoxifen, or an aromatase inhibitor such as letrozole) for 5 to 10 years, starting after chemotherapy.' }),
            P({ name:'Abemaciclib (Verzenio), if higher-risk', short:'Abemaciclib', mods:['targeted'], mode:'daily', weeks:104, optional:true, on:false, concurrent:true,
                plain:'For higher-risk cancers, a targeted tablet taken twice a day alongside the hormone tablet for 2 years (monarchE).' }),
            P({ name:'Ribociclib (Kisqali), if higher-risk', short:'Ribociclib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false, concurrent:true,
                plain:'The other targeted-tablet option for higher-risk cancers: taken alongside the hormone tablet for 3 years, 3 weeks on and 1 week off (NATALEE). Your team recommends one or the other, not both.' }),
          ], 'Chemo beneficial'),
          Br('Chemotherapy would not add benefit', [
            RADIATION_AFTER(true),
            P({ name:'Hormone (endocrine) therapy', short:'Hormone tablet', mods:['endocrine'], mode:'daily', weeks:260,
                plain:'One tablet a day (tamoxifen, or an aromatase inhibitor such as letrozole) for 5 to 10 years. Skipping chemotherapy does not lower your chance of cure; the test shows it would add side effects without adding benefit.' }),
            P({ name:'Abemaciclib (Verzenio), if higher-risk', short:'Abemaciclib', mods:['targeted'], mode:'daily', weeks:104, optional:true, on:false, concurrent:true,
                plain:'For higher-risk cancers, a targeted tablet taken twice a day alongside the hormone tablet for 2 years (monarchE).' }),
            P({ name:'Ribociclib (Kisqali), if higher-risk', short:'Ribociclib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false, concurrent:true,
                plain:'The other targeted-tablet option for higher-risk cancers: taken alongside the hormone tablet for 3 years, 3 weeks on and 1 week off (NATALEE). Your team recommends one or the other, not both.' }),
          ], 'Chemo not beneficial'),
        ] }),
  ]
},

/* ---------- KIDNEY: belzutifan + pembrolizumab ---------- */
{
  id:'ls022', plan:'Kidney surgery, then immunotherapy with a targeted tablet', group:'Kidney', added:'2026-09-01', reviewed:'2026-09-02', reviewedBy:'AL, 2026-09-02',
  refs:[{t:'Choueiri TK et al. LITESPARK-022: adjuvant pembrolizumab plus belzutifan vs pembrolizumab for clear cell RCC. NEJM 2026',q:'LITESPARK-022 belzutifan pembrolizumab adjuvant clear cell renal cell carcinoma Choueiri NEJM'},{t:'FDA approval of belzutifan with pembrolizumab for adjuvant treatment of renal cell carcinoma, June 12, 2026',q:'FDA approves belzutifan pembrolizumab adjuvant renal cell carcinoma 2026'}],
  disease:'gu', name:'LITESPARK-022: nephrectomy, then pembrolizumab + belzutifan for a year',
  trial:'LITESPARK-022', summary:'Clear-cell kidney cancer at intermediate-high or high risk after nephrectomy (or after removal of metastases). Pembrolizumab for up to a year plus belzutifan tablets for up to 54 weeks.',
  title:'Kidney surgery, then a year of immunotherapy together with a daily targeted tablet',
  subtitle:'Kidney cancer (clear-cell type) at higher risk of returning after surgery',
  nodes:[
    S('Surgery (nephrectomy)', 'Removal of the affected kidney, or the part of it containing the cancer. Sometimes this also includes removal of a small number of spread deposits.'),
    R('Healing after surgery', 8, 'Recovery from surgery. Treatment starts within 12 weeks of the operation.'),
    P({ name:'Pembrolizumab (Keytruda)', short:'Pembrolizumab', mods:['io'], cycleDays:42, cycles:9,
        plain:'Immunotherapy by IV every 6 weeks (or every 3 weeks) for up to one year. It helps your immune system find and destroy any remaining cancer cells.' }),
    P({ name:'Belzutifan (Welireg) tablets', short:'Belzutifan', mods:['targeted'], mode:'daily', weeks:54, concurrent:true,
        plain:'A targeted tablet taken once a day for up to 54 weeks, alongside the immunotherapy. It blocks HIF-2α, a signal that clear-cell kidney cancer depends on. Anemia and low oxygen levels are the side effects to watch, with regular blood tests.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Scans every 6 months', plain:'Regular visits and CT scans after treatment is finished.' }),
  ]
},

/* ---------- HEAD AND NECK: nasopharynx (additions) ---------- */
{
  id:'npc-crt', plan:'Chemoradiation alone', group:'Nasopharynx', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Chen QY et al. Concurrent chemoradiotherapy vs radiotherapy alone in stage II nasopharyngeal carcinoma. JNCI 2011',q:'concurrent chemoradiotherapy versus radiotherapy alone stage II nasopharyngeal carcinoma Chen JNCI 2011'},{t:'NCCN Guidelines: Head and Neck Cancers (nasopharynx)',q:'NCCN nasopharyngeal carcinoma concurrent chemoradiation'}],
  disease:'hn', name:'Nasopharyngeal cancer: concurrent cisplatin + radiation (no induction)',
  trial:'NCCN standard (Chen JNCI 2011)', summary:'Stage II and lower-risk stage III nasopharyngeal carcinoma. Concurrent cisplatin with 7 weeks of radiation, without induction or adjuvant chemotherapy.',
  title:'Seven weeks of radiation with cisplatin, aiming to cure the cancer',
  subtitle:'Nasopharyngeal cancer, stage II to III (lower risk)',
  nodes:[
    P({ name:'Radiation with cisplatin (chemoradiation)', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:7,
        plain:'Radiation to the nasopharynx and neck every weekday for about 7 weeks, with cisplatin every 3 weeks (3 doses) or weekly to make it more effective. A dental check and nutrition plan are arranged before starting.' }),
    R('Recovery and first scan', 12, 'Side effects take 2 to 3 months to settle. An MRI or PET/CT about 12 weeks after treatment checks the response.'),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams and EBV blood tests every 3 months in the first year',
        plain:'Regular exams, scopes, and Epstein-Barr virus DNA blood tests, with hearing and thyroid checks.' }),
  ]
},
{
  id:'npc-adj', plan:'Chemoradiation, then chemotherapy after', group:'Nasopharynx', added:'2026-09-01', reviewed:'2026-09-01', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Al-Sarraf M et al. Intergroup 0099: chemoradiotherapy vs radiotherapy in advanced nasopharyngeal cancer. JCO 1998',q:'Intergroup 0099 chemoradiotherapy nasopharyngeal Al-Sarraf JCO 1998'},{t:'Blanchard P et al. MAC-NPC meta-analysis. Lancet Oncology 2015',q:'MAC-NPC meta-analysis chemotherapy nasopharyngeal carcinoma Blanchard Lancet Oncology 2015'}],
  disease:'hn', name:'Nasopharyngeal cancer: cisplatin + radiation, then adjuvant cisplatin + 5-FU ×3',
  trial:'Intergroup 0099', summary:'Locally advanced nasopharyngeal carcinoma. Concurrent cisplatin with 7 weeks of radiation, then 3 cycles of cisplatin + 5-FU.',
  title:'Seven weeks of radiation with cisplatin, then three cycles of chemotherapy',
  subtitle:'Nasopharyngeal cancer, stage III to IVA',
  nodes:[
    P({ name:'Radiation with cisplatin (chemoradiation)', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:7,
        plain:'Radiation to the nasopharynx and neck every weekday for about 7 weeks, with cisplatin every 3 weeks (3 doses) to make it more effective.' }),
    R('Recovery', 4, 'A short break of about 4 weeks for the mouth and throat to settle before chemotherapy.'),
    P({ name:'Cisplatin + 5-FU (adjuvant)', short:'Cisplatin + 5-FU', mods:['chemo'], cycleDays:28, cycles:3,
        visits:[{d:1,label:'Cisplatin, then a 5-FU pump worn for 4 days'}],
        plain:'Two chemotherapy drugs every 4 weeks, 3 times, to lower the chance of the cancer returning elsewhere. 5-FU runs through a pump worn home for 4 days each cycle.' }),
    R('Recovery and first scan', 8, 'An MRI or PET/CT about 12 weeks after radiation checks the response.'),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Exams and EBV blood tests every 3 months in the first year',
        plain:'Regular exams, scopes, and Epstein-Barr virus DNA blood tests, with hearing and thyroid checks.' }),
  ]
},

/* ---------- Gynecologic ---------- */
{
  id:'portec2', plan:'Surgery, then internal radiation', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Nout RA et al. PORTEC-2: vaginal brachytherapy versus pelvic external beam radiotherapy for high-intermediate risk endometrial cancer. Lancet 2010',q:'PORTEC-2 vaginal brachytherapy pelvic radiotherapy endometrial Nout Lancet 2010'},{t:'Randall ME et al. GOG 249: pelvic radiation versus vaginal brachytherapy plus chemotherapy in high-intermediate and high-risk early-stage endometrial cancer. JCO 2019',q:'GOG 249 vaginal cuff brachytherapy paclitaxel carboplatin pelvic radiation endometrial Randall'}],
  disease:'gyn', name:'Surgery, then vaginal brachytherapy (PORTEC-2)',
  trial:'PORTEC-2', summary:'Endometrial cancer, stage I to II, high-intermediate risk (age, grade, depth of invasion, or lymphovascular invasion). Hysterectomy, then vaginal brachytherapy in 3 sessions, then surveillance. GOG-249 showed adding chemotherapy does not improve on this.',
  title:'Surgery first, then a short course of internal radiation',
  subtitle:'Endometrial (uterine) cancer, stage I to II, high-intermediate risk',
  nodes:[
    S('Surgery (hysterectomy)', 'Removal of the uterus and cervix, usually with the ovaries, fallopian tubes, and some lymph nodes, most often through small keyhole incisions. The removed tissue is examined under the microscope to confirm the stage and the cancer\'s features, which guide the next steps.'),
    R('Healing after surgery', 6, 'Time to recover from surgery. Internal radiation usually starts about 6 to 8 weeks after the operation.'),
    P({ name:'Vaginal brachytherapy (internal radiation)', short:'Brachytherapy', mods:['radiation'], cycleDays:7, cycles:3,
        plain:'Radiation given from inside the vagina through a small applicator, in 3 outpatient sessions about a week apart. Each session takes a few minutes, and you are not radioactive afterwards. It lowers the chance of the cancer returning at the top of the vagina with fewer bowel side effects than radiation to the whole pelvis.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and exams every 3 to 6 months, then yearly',
        plain:'Regular visits with a pelvic exam. Scans are done if there are symptoms. Most follow-up is every 3 to 6 months for the first 2 to 3 years, then yearly.' }),
  ]
},
{
  id:'portec3', plan:'Surgery, then radiation with chemotherapy, then more chemotherapy', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'de Boer SM et al. PORTEC-3: adjuvant chemoradiotherapy versus radiotherapy alone for high-risk endometrial cancer, final results. Lancet Oncology 2018',q:'PORTEC-3 adjuvant chemoradiotherapy radiotherapy high-risk endometrial cancer de Boer Lancet Oncology 2018'},{t:'de Boer SM et al. PORTEC-3: patterns of recurrence and post-hoc survival analysis. Lancet Oncology 2019',q:'PORTEC-3 patterns of recurrence post-hoc survival de Boer Lancet Oncology 2019'},{t:'León-Castillo A et al. Molecular classification of PORTEC-3: benefit of chemotherapy by molecular subgroup. JCO 2020',q:'PORTEC-3 molecular classification p53 abnormal POLE chemotherapy benefit León-Castillo JCO 2020'}],
  disease:'gyn', name:'Surgery, radiation with cisplatin, then carboplatin + paclitaxel ×4 (PORTEC-3)',
  trial:'PORTEC-3', summary:'High-risk endometrial cancer: stage I grade 3 with deep invasion or lymphovascular invasion, stage II to III, or serous or clear-cell histology. Hysterectomy, pelvic radiation over about 5 to 6 weeks with cisplatin in weeks 1 and 4, then carboplatin + paclitaxel every 3 weeks ×4. Benefit is largest in stage III and p53-abnormal tumors.',
  title:'Surgery first, then radiation with chemotherapy, then four cycles of chemotherapy',
  subtitle:'Endometrial (uterine) cancer, high-risk stage I to III',
  nodes:[
    S('Surgery (hysterectomy)', 'Removal of the uterus and cervix, usually with the ovaries, fallopian tubes, and lymph nodes. The removed tissue is examined under the microscope to confirm the stage and the cancer\'s features, including its molecular profile, which guide the next steps.'),
    HEAL(6),
    P({ name:'Pelvic radiation with cisplatin', short:'Radiation + cisplatin', mods:['radiation','chemo'], mode:'weekdays', weeks:6,
        plain:'Radiation to the pelvis Monday to Friday for about 5 and a half weeks. Cisplatin, a chemotherapy drug, is given by IV twice during this time, in the first and fourth weeks, to make the radiation work better.' }),
    R('Recovery', 3, 'A short break for your body to recover from the radiation before chemotherapy starts.'),
    P({ name:'Carboplatin + paclitaxel', short:'Carboplatin + paclitaxel', mods:['chemo'], cycleDays:21, cycles:4,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 4 times (about 3 months). This part of the treatment lowers the chance of the cancer returning elsewhere in the body.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and exams every 3 to 6 months, scans if needed',
        plain:'Regular visits with a pelvic exam, and scans when there are symptoms or findings to check. Most follow-up is every 3 to 6 months for the first 2 to 3 years, then yearly.' }),
  ]
},
{
  id:'gog258', plan:'Surgery, then six cycles of chemotherapy', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Matei D et al. GOG-258: adjuvant chemotherapy plus radiation versus chemotherapy alone for stage III to IVA endometrial cancer. NEJM 2019',q:'GOG 258 adjuvant chemotherapy plus radiation locally advanced endometrial cancer Matei NEJM 2019'}],
  disease:'gyn', name:'Surgery, then carboplatin + paclitaxel ×6 (GOG-258)',
  trial:'GOG-258', summary:'Endometrial cancer, stage III to IVA, after hysterectomy. Carboplatin + paclitaxel every 3 weeks ×6. In GOG-258, adding pelvic radiation to chemotherapy did not improve relapse-free survival; vaginal brachytherapy is an optional add-on. Compare with PORTEC-3 for the same stage.',
  title:'Surgery first, then six cycles of chemotherapy',
  subtitle:'Endometrial (uterine) cancer, stage III to IVA',
  nodes:[
    S('Surgery (hysterectomy and staging)', 'Removal of the uterus, cervix, ovaries, and fallopian tubes, with removal of visible cancer and lymph nodes. The removed tissue is examined under the microscope to confirm the stage and the cancer\'s features, which guide the next steps.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel', short:'Carboplatin + paclitaxel', mods:['chemo'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 6 times (about 4 and a half months). Each visit takes a few hours. Blood counts are checked before each dose.' }),
    P({ name:'Vaginal brachytherapy (if recommended)', short:'Brachytherapy', mods:['radiation'], cycleDays:7, cycles:3, optional:true, on:false,
        plain:'Some teams add 3 short sessions of internal radiation to the top of the vagina, about a week apart, to lower the chance of the cancer returning there. Your team will say whether this is recommended for you.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and exams every 3 months at first, scans as needed',
        plain:'Regular visits with a pelvic exam, and scans when there are symptoms or findings to check. Visits are every 3 months at first, then less often.' }),
  ]
},
{
  id:'gy018', plan:'Chemotherapy with immunotherapy, then immunotherapy alone', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Eskander RN et al. NRG-GY018: pembrolizumab plus chemotherapy in advanced endometrial cancer. NEJM 2023',q:'NRG-GY018 pembrolizumab chemotherapy advanced endometrial cancer Eskander NEJM 2023'},{t:'Westin SN et al. DUO-E: durvalumab plus carboplatin/paclitaxel with maintenance durvalumab with or without olaparib in endometrial cancer. JCO 2024',q:'DUO-E durvalumab carboplatin paclitaxel olaparib endometrial cancer Westin JCO'}],
  disease:'gyn', name:'Surgery, carboplatin + paclitaxel + pembrolizumab ×6, then pembrolizumab maintenance (NRG-GY018)',
  trial:'NRG-GY018', summary:'Endometrial cancer, stage III to IVA with measurable disease, stage IVB, or first recurrence. Surgery where possible, then carboplatin + paclitaxel + pembrolizumab every 3 weeks ×6, then pembrolizumab every 6 weeks for up to 14 doses. Approved for both mismatch-repair-deficient and proficient tumors; durvalumab (DUO-E) is an alternative for mismatch-repair-deficient tumors. Remove the surgery step for recurrent or inoperable disease.',
  title:'Surgery, then chemotherapy with immunotherapy, then immunotherapy on its own',
  subtitle:'Endometrial (uterine) cancer, stage III to IV or returned after earlier treatment',
  nodes:[
    S('Surgery (hysterectomy and removal of visible cancer)', 'Removal of the uterus, cervix, ovaries, and fallopian tubes, with removal of as much visible cancer as possible. The removed tissue is tested for mismatch-repair proteins, which tells the team how much benefit to expect from immunotherapy.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel + pembrolizumab (Keytruda)', short:'Carbo + paclitaxel + immunotherapy', mods:['chemo','io'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs plus pembrolizumab, an immunotherapy that helps your own immune system recognize and attack cancer cells, all by IV every 3 weeks, 6 times (about 4 and a half months).' }),
    P({ name:'Pembrolizumab maintenance', short:'Pembrolizumab', mods:['io'], cycleDays:42, cycles:14,
        plain:'Immunotherapy on its own, by IV every 6 weeks, for up to 14 doses (about 20 months). Visits are short. Treatment stops earlier if the cancer grows or side effects require it.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and scans every 3 to 6 months',
        plain:'Regular visits, exams, and scans every 3 to 6 months once treatment is complete.' }),
  ]
},
{
  id:'ruby', plan:'Chemotherapy with immunotherapy, then immunotherapy for up to 3 years', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Mirza MR et al. RUBY: dostarlimab for primary advanced or recurrent endometrial cancer. NEJM 2023',q:'RUBY dostarlimab primary advanced recurrent endometrial cancer Mirza NEJM 2023'}],
  disease:'gyn', name:'Surgery, carboplatin + paclitaxel + dostarlimab ×6, then dostarlimab for up to 3 years (RUBY)',
  trial:'RUBY', summary:'Endometrial cancer, primary stage III to IV or first recurrence. Surgery where possible, then carboplatin + paclitaxel + dostarlimab every 3 weeks ×6, then dostarlimab every 6 weeks for up to 3 years in total. Greatest benefit in mismatch-repair-deficient tumors; approved for all comers. Remove the surgery step for recurrent or inoperable disease.',
  title:'Surgery, then chemotherapy with immunotherapy, then immunotherapy for up to three years',
  subtitle:'Endometrial (uterine) cancer, stage III to IV or returned after earlier treatment',
  nodes:[
    S('Surgery (hysterectomy and removal of visible cancer)', 'Removal of the uterus, cervix, ovaries, and fallopian tubes, with removal of as much visible cancer as possible. The removed tissue is tested for mismatch-repair proteins, which tells the team how much benefit to expect from immunotherapy.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel + dostarlimab (Jemperli)', short:'Carbo + paclitaxel + immunotherapy', mods:['chemo','io'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs plus dostarlimab, an immunotherapy that helps your own immune system recognize and attack cancer cells, all by IV every 3 weeks, 6 times (about 4 and a half months).' }),
    P({ name:'Dostarlimab maintenance', short:'Dostarlimab', mods:['io'], cycleDays:42, cycles:23,
        plain:'Immunotherapy on its own, by IV every 6 weeks, continuing until 3 years from the start of treatment. Visits are short. Treatment stops earlier if the cancer grows or side effects require it.' }),
    P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits and scans every 3 to 6 months',
        plain:'Regular visits, exams, and scans every 3 to 6 months once treatment is complete.' }),
  ]
},
{
  id:'usc-her2', plan:'Chemotherapy with a HER2 antibody, then the antibody alone', group:'Uterine and endometrial', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Fader AN et al. Randomized phase II trial of carboplatin-paclitaxel versus carboplatin-paclitaxel-trastuzumab in HER2-positive uterine serous carcinoma. JCO 2018',q:'Fader carboplatin paclitaxel trastuzumab uterine serous carcinoma HER2 JCO 2018'},{t:'Fader AN et al. Updated survival analysis of carboplatin-paclitaxel with or without trastuzumab in advanced HER2-positive uterine serous carcinoma. Clinical Cancer Research 2020',q:'Fader trastuzumab uterine serous carcinoma updated survival Clinical Cancer Research 2020'}],
  disease:'gyn', name:'Surgery, carboplatin + paclitaxel + trastuzumab ×6, then trastuzumab maintenance (HER2-positive uterine serous)',
  trial:'Fader randomized phase II (NCT01367002)', summary:'Uterine serous carcinoma that overexpresses HER2, stage III to IV or recurrent. Surgery where possible, then carboplatin + paclitaxel + trastuzumab every 3 weeks ×6, then trastuzumab alone every 3 weeks until progression. Randomized phase II with a survival benefit; guideline-listed option.',
  title:'Surgery, then chemotherapy with a HER2-targeted antibody, then the antibody on its own',
  subtitle:'Uterine serous carcinoma, HER2-positive, stage III to IV',
  nodes:[
    S('Surgery (hysterectomy and removal of visible cancer)', 'Removal of the uterus, cervix, ovaries, and fallopian tubes, with removal of as much visible cancer as possible. The removed tissue is tested for HER2, a protein on the cancer cells that the antibody in this plan targets.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel + trastuzumab (Herceptin)', short:'Carbo + paclitaxel + trastuzumab', mods:['chemo','targeted'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs plus trastuzumab, an antibody that targets the HER2 protein on the cancer cells, all by IV every 3 weeks, 6 times (about 4 and a half months). Heart function is checked before and during treatment.' }),
    P({ name:'Trastuzumab maintenance', short:'Trastuzumab', mods:['targeted'], mode:'ongoing', weeks:52, openEnded:true, freqText:'By IV every 3 weeks, for as long as it keeps working',
        plain:'The antibody on its own, by IV every 3 weeks, continuing for as long as it keeps the cancer controlled and side effects allow. Visits are short, with heart checks every few months.' }),
  ]
},
{
  id:'ov-pds', plan:'Surgery first, then chemotherapy, then maintenance guided by tumor testing', group:'Ovarian', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Burger RA et al. GOG-218: incorporation of bevacizumab in the primary treatment of ovarian cancer. NEJM 2011',q:'GOG 218 bevacizumab primary treatment ovarian cancer Burger NEJM 2011'},{t:'Moore K et al. SOLO-1: maintenance olaparib in newly diagnosed advanced ovarian cancer with a BRCA mutation. NEJM 2018',q:'SOLO-1 maintenance olaparib newly diagnosed advanced ovarian cancer Moore NEJM 2018'},{t:'González-Martín A et al. PRIMA: niraparib in newly diagnosed advanced ovarian cancer. NEJM 2019',q:'PRIMA niraparib newly diagnosed advanced ovarian cancer González-Martín NEJM 2019'},{t:'Ray-Coquard I et al. PAOLA-1: olaparib plus bevacizumab as first-line maintenance in ovarian cancer. NEJM 2019',q:'PAOLA-1 olaparib bevacizumab first-line maintenance ovarian cancer Ray-Coquard NEJM 2019'}],
  disease:'gyn', name:'Surgery first, carboplatin + paclitaxel ×6, then maintenance by BRCA / HRD result',
  trial:'GOG-218 / SOLO-1 / PRIMA / PAOLA-1', summary:'High-grade ovarian, fallopian tube, or primary peritoneal cancer, stage III to IV, when the cancer looks removable up front. Debulking surgery, carboplatin + paclitaxel every 3 weeks ×6 (bevacizumab optional), then a PARP inhibitor for 2 to 3 years if BRCA-mutated or HRD-positive, otherwise bevacizumab or surveillance. Compare with the chemotherapy-first sequence.',
  title:'Surgery first, then chemotherapy, then a maintenance tablet chosen by the tumor\'s genes',
  subtitle:'Ovarian cancer (including fallopian tube and primary peritoneal), stage III to IV',
  nodes:[
    S('Surgery (debulking)', 'A major operation to remove the ovaries, fallopian tubes, uterus, and as much visible cancer as possible from the abdomen. Removing all visible cancer is the strongest predictor of a good outcome. The removed tissue is tested for BRCA mutations and homologous recombination deficiency (HRD), which decide the maintenance step.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel', short:'Carboplatin + paclitaxel', mods:['chemo'], cycleDays:21, cycles:6,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 6 times (about 4 and a half months). Each visit takes several hours. Blood counts are checked before each dose.' }),
    P({ name:'Bevacizumab (Avastin), if used', short:'Bevacizumab', mods:['targeted'], cycleDays:21, cycles:5, optional:true, on:false, concurrent:true,
        plain:'An antibody that blocks the blood supply to tumors, given by IV with the chemotherapy from the second cycle onwards, then continued in the maintenance step. Used mainly when cancer could not be fully removed. Your team will say whether it is part of your plan.' }),
    D({ name:'Tumor test result (BRCA and HRD)', short:'Gene test', question:'What did the tumor\'s gene tests show?',
        plain:'The removed tumor is tested for BRCA mutations and for a wider repair defect called homologous recombination deficiency (HRD). About half of high-grade ovarian cancers have one of these, and they respond especially well to PARP inhibitor tablets.',
        branches:[
          Br('BRCA mutation or HRD-positive', [
            P({ name:'Olaparib (Lynparza) tablets for 2 years', short:'Olaparib', mods:['targeted'], mode:'daily', weeks:104, optional:true, on:true,
                plain:'A PARP inhibitor tablet taken twice a day for 2 years, starting within about 2 months of the last chemotherapy (SOLO-1). If bevacizumab is part of your plan, olaparib is given alongside it (PAOLA-1). Blood counts are checked regularly.' }),
            P({ name:'Niraparib (Zejula) tablets for 3 years', short:'Niraparib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false,
                plain:'The other PARP inhibitor option: one tablet a day for up to 3 years (PRIMA). Your team recommends one PARP inhibitor, not both.' }),
          ], 'BRCA or HRD positive'),
          Br('No BRCA mutation and HRD-negative', [
            P({ name:'Bevacizumab (Avastin) maintenance, if used', short:'Bevacizumab', mods:['targeted'], cycleDays:21, cycles:16, optional:true, on:false,
                plain:'If bevacizumab was started with chemotherapy, it continues on its own by IV every 3 weeks for about 15 months in total (GOG-218).' }),
            P({ name:'Niraparib (Zejula) tablets, if recommended', short:'Niraparib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false,
                plain:'Niraparib is approved for all patients after a response to chemotherapy, but the benefit is smaller when the tumor is HRD-negative (PRIMA). Your team will weigh it against side effects.' }),
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits, blood tests (CA-125), and scans every 3 months at first',
                plain:'Regular visits with a blood test for the tumor marker CA-125 and scans when needed, every 3 months at first and less often over time.' }),
          ], 'BRCA and HRD negative'),
        ] }),
  ]
},
{
  id:'ov-nact', plan:'Chemotherapy first, surgery in the middle, then more chemotherapy and maintenance', group:'Ovarian', added:'2026-09-08', reviewed:'2026-09-08', reviewedBy:'Source-checked; physician sign-off pending',
  refs:[{t:'Vergote I et al. EORTC 55971: neoadjuvant chemotherapy or primary surgery in stage IIIC or IV ovarian cancer. NEJM 2010',q:'EORTC 55971 neoadjuvant chemotherapy primary surgery stage IIIC IV ovarian cancer Vergote NEJM 2010'},{t:'Kehoe S et al. CHORUS: primary chemotherapy versus primary surgery for newly diagnosed advanced ovarian cancer. Lancet 2015',q:'CHORUS primary chemotherapy versus primary surgery advanced ovarian cancer Kehoe Lancet 2015'},{t:'van Driel WJ et al. Hyperthermic intraperitoneal chemotherapy in ovarian cancer (OVHIPEC-1). NEJM 2018',q:'hyperthermic intraperitoneal chemotherapy ovarian cancer interval cytoreductive surgery van Driel NEJM 2018'},{t:'Moore K et al. SOLO-1: maintenance olaparib in newly diagnosed advanced ovarian cancer with a BRCA mutation. NEJM 2018',q:'SOLO-1 maintenance olaparib newly diagnosed advanced ovarian cancer Moore NEJM 2018'},{t:'González-Martín A et al. PRIMA: niraparib in newly diagnosed advanced ovarian cancer. NEJM 2019',q:'PRIMA niraparib newly diagnosed advanced ovarian cancer González-Martín NEJM 2019'}],
  disease:'gyn', name:'Carboplatin + paclitaxel ×3, interval debulking surgery, ×3 more, then maintenance by BRCA / HRD result',
  trial:'EORTC 55971 / CHORUS', summary:'High-grade ovarian, fallopian tube, or primary peritoneal cancer, stage IIIC to IV, when up-front surgery is unlikely to remove everything or is too risky. Carboplatin + paclitaxel every 3 weeks ×3, interval debulking surgery (heated intraperitoneal chemotherapy optional), 3 more cycles, then a PARP inhibitor for 2 to 3 years if BRCA-mutated or HRD-positive, otherwise bevacizumab or surveillance. Compare with the surgery-first sequence.',
  title:'Chemotherapy first, surgery in the middle, then chemotherapy and a maintenance tablet chosen by the tumor\'s genes',
  subtitle:'Ovarian cancer (including fallopian tube and primary peritoneal), stage IIIC to IV',
  nodes:[
    P({ name:'Carboplatin + paclitaxel (before surgery)', short:'Carboplatin + paclitaxel', mods:['chemo'], cycleDays:21, cycles:3,
        plain:'Two chemotherapy drugs by IV every 3 weeks, 3 times, to shrink the cancer so that surgery can remove more of it safely. A biopsy before this step confirms the diagnosis and is tested for BRCA mutations and HRD.' }),
    S('Interval surgery (debulking)', 'A major operation, about 3 to 4 weeks after the third cycle, to remove the ovaries, fallopian tubes, uterus, and as much visible cancer as possible. Some centers add heated chemotherapy washed through the abdomen during the operation (HIPEC). The removed tissue shows how well the chemotherapy worked.'),
    HEAL(4),
    P({ name:'Carboplatin + paclitaxel (after surgery)', short:'Carboplatin + paclitaxel', mods:['chemo'], cycleDays:21, cycles:3,
        plain:'Three more cycles of the same two drugs by IV every 3 weeks, to complete 6 cycles in total.' }),
    P({ name:'Bevacizumab (Avastin), if used', short:'Bevacizumab', mods:['targeted'], cycleDays:21, cycles:3, optional:true, on:false, concurrent:true,
        plain:'An antibody that blocks the blood supply to tumors, given by IV with the chemotherapy after surgery, then continued in the maintenance step. Your team will say whether it is part of your plan.' }),
    D({ name:'Tumor test result (BRCA and HRD)', short:'Gene test', question:'What did the tumor\'s gene tests show?',
        plain:'The tumor is tested for BRCA mutations and for a wider repair defect called homologous recombination deficiency (HRD). About half of high-grade ovarian cancers have one of these, and they respond especially well to PARP inhibitor tablets.',
        branches:[
          Br('BRCA mutation or HRD-positive', [
            P({ name:'Olaparib (Lynparza) tablets for 2 years', short:'Olaparib', mods:['targeted'], mode:'daily', weeks:104, optional:true, on:true,
                plain:'A PARP inhibitor tablet taken twice a day for 2 years, starting within about 2 months of the last chemotherapy (SOLO-1). If bevacizumab is part of your plan, olaparib is given alongside it (PAOLA-1). Blood counts are checked regularly.' }),
            P({ name:'Niraparib (Zejula) tablets for 3 years', short:'Niraparib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false,
                plain:'The other PARP inhibitor option: one tablet a day for up to 3 years (PRIMA). Your team recommends one PARP inhibitor, not both.' }),
          ], 'BRCA or HRD positive'),
          Br('No BRCA mutation and HRD-negative', [
            P({ name:'Bevacizumab (Avastin) maintenance, if used', short:'Bevacizumab', mods:['targeted'], cycleDays:21, cycles:16, optional:true, on:false,
                plain:'If bevacizumab was started with chemotherapy, it continues on its own by IV every 3 weeks for about 15 months in total (GOG-218).' }),
            P({ name:'Niraparib (Zejula) tablets, if recommended', short:'Niraparib', mods:['targeted'], mode:'daily', weeks:156, optional:true, on:false,
                plain:'Niraparib is approved for all patients after a response to chemotherapy, but the benefit is smaller when the tumor is HRD-negative (PRIMA). Your team will weigh it against side effects.' }),
            P({ name:'Surveillance', short:'Surveillance', mods:['watch'], mode:'ongoing', weeks:104, openEnded:true, freqText:'Visits, blood tests (CA-125), and scans every 3 months at first',
                plain:'Regular visits with a blood test for the tumor marker CA-125 and scans when needed, every 3 months at first and less often over time.' }),
          ], 'BRCA and HRD negative'),
        ] }),
  ]
}
];

/* A worked comparison, used by the "See a comparison" example link.
   Patient-facing wording; the trade-offs are the ones a clinic would actually discuss. */
const COMPARE_EXAMPLE = {
  title:'Your treatment options',
  diagnosis:'hormone-receptor negative, HER2-positive breast cancer',
  stage:'III',
  rec:null,
  recWhy:'',
  options:[
    { name:'Trastuzumab deruxtecan first (DESTINY-Breast11)', regimenId:'db11',
      pros:'A newer approach designed for higher-risk HER2-positive cancer\nMay increase the chance that no cancer is left by the time of surgery',
      cons:'Trastuzumab deruxtecan (Enhertu) carries a small but serious risk of lung inflammation, which we watch for closely\nMore months of treatment before surgery' },
    { name:'TCHP before surgery', regimenId:'tchp',
      pros:'A long-established standard, with many years of experience and results behind it\nWell-understood side effects and a familiar schedule',
      cons:'Lowers blood counts more, so an injection to help them recover is often needed' },
  ],
};

const APP_VERSION = '0.18.0';
const CHANGELOG = [
  { date:'2026-09-08', text:'0.18.0: New Gynecologic tab with eight pathways. Uterine and endometrial: PORTEC-2 (surgery, vaginal brachytherapy), PORTEC-3 (surgery, radiation with cisplatin, carboplatin + paclitaxel), GOG-258 (surgery, carboplatin + paclitaxel ×6), NRG-GY018 (chemotherapy + pembrolizumab, then pembrolizumab), RUBY (chemotherapy + dostarlimab, then dostarlimab up to 3 years), HER2-positive uterine serous (chemotherapy + trastuzumab, then trastuzumab). Ovarian: surgery-first and chemotherapy-first sequences, each ending in a maintenance choice set by the BRCA and HRD results.' },
  { date:'2026-09-08', text:'0.17.0: Renamed to Roadbook; new wordmark and mark; old ONCourse URLs redirect with the share fragment preserved.' },
  { date:'2026-09-04', text:'0.16.0: The builder now asks each new user to agree once to the terms of use before opening: educational aid, physician responsibility for doses and schedules, no patient names, and the copyright notice. Shared plans and examples open straight to the patient view as before. A LICENSE file states the all-rights-reserved terms in the source repository. The terms of use now name the authors, state that ONCourse is a personal project independent of any employer, and add governing law (Washington), user responsibility, and the agreement as a whole.' },
  { date:'2026-09-03', text:'Breast surgery text: "examined to see how well the treatment worked" now appears only when treatment came before surgery (KEYNOTE-522, DESTINY-Breast11, TCHP). Surgery-first pathways say the removed tissue confirms the stage and the cancer\'s features, which guide the next steps.' },
  { date:'2026-09-03', text:'0.15.0: Compare options gains a "show only the steps that differ" switch, so shared steps such as surgery or hormone therapy drop out of the columns and are listed in one line instead. Breast: the two adjuvant chemotherapy-only pathways (dose-dense AC then paclitaxel; TC ×4) are now triple-negative by default with the hormone-therapy step switched off, and two new hormone-receptor-positive pathways carry the same chemotherapy followed by endocrine therapy.' },
  { date:'2026-09-02', text:'Builder: the title block (page title, sequence sentence, cancer type and stage line, trial or source) is now edited at the top of step 3 instead of the Regimen details panel. The Overall line now states how long hormone tablets continue, so it changes when that step is edited. A second image export saves just the timeline, large and sharp, for a chart note. The prepared date can be switched off or typed in by hand. When several treatments run alongside one step, the longest now sits nearest the main bar with shorter ones stacked above it.' },
  { date:'2026-09-02', text:'Breast pathways signed off by the founder after review. KEYNOTE-522 now names CREATE-X as the source of the capecitabine step. APT: trastuzumab after the paclitaxel weeks may be weekly or every 3 weeks. The monarchE and NATALEE pathways now offer both common chemotherapy options (TC, or dose-dense AC then paclitaxel) as switchable steps before radiation, and the option names for these and the genomic-test pathway say so.' },
  { date:'2026-09-02', text:'0.13.0: Funding statement finalized in the disclaimer. Pathway review labels reworded and a dosing-and-schedule caution added for physicians. "How we chose this plan for you" rebuilt around plan adjustments. Privacy guardrail added to the test suite.' },
  { date:'2026-09-02', text:'The handout can now carry a "Prepared for ____" line for the patient\'s name, on by default and printed blank on purpose: write the name in by hand, or type it into the saved PDF, so it never touches the browser. On the map, labels for treatment given alongside another step now use the same type as every other step label, and the Surgery label no longer touches its marker.' },
  { date:'2026-09-02', text:'On a phone, the builder now starts with the pathway list, and tapping a pathway shows a compact preview (title and timeline) right below it. "Use this pathway" pins the handout to the top, collapsed to the map with a button to show the full handout, and the editing steps continue underneath. Links that open a specific map are unchanged.' },
  { date:'2026-09-02', text:'Adding a treatment type to a step now updates its timeline label as well: a chemotherapy step gains "+ immunotherapy" the moment that type is ticked, and removing the type takes it back off. Labels that already name the added type are left alone.' },
  { date:'2026-09-02', text:'The builder can now save the handout as an image (PNG), ready to paste into a chart or an after-visit summary; everything still happens in your browser. Renaming a step now updates its label on the timeline too, unless you have typed your own short label. On a phone, the preview sits at the top with the timeline scaled to fit the screen (pinch to zoom), and the editing sections open with a tap. Handout type is larger on the map and in the step list, the web address no longer prints at the bottom of the page in most browsers, and the site\'s own fonts now load as intended. The abemaciclib pathway no longer mentions ribociclib; that option lives in its own NATALEE pathway.' },
  { date:'2026-09-02', text:'Every pathway was re-verified against its primary publication and trial registry record, with physician review of the findings. Corrections: ADRIATIC durvalumab now runs up to 2 full years (26 four-week cycles, not 24); PACIFIC durvalumab now follows the trial\'s every-2-week schedule, with the every-4-week label option noted; adjuvant melanoma pembrolizumab is 18 doses for stage III (17 for stage IIB/IIC); short-course prostate hormone therapy is 4 months, starting 2 months before radiation and ending with it, with none after (RTOG 94-08); bladder-preserving chemoradiation length is now set by the radiation team (4 or 6.5 weeks in BC2001); the gene-test pathway lists abemaciclib (2 years) and ribociclib (3 years) as separate options instead of one shared duration; S1801\'s population reads stage IIIB to IV. Open-ended treatment such as osimertinib after chemoradiation (LAURA) now shows "ongoing" on the map instead of a fixed number of years.' },
  { date:'2026-09-01', text:'KEYNOTE-522: the patient text now says that giving capecitabine after radiation is common practice rather than an order fixed by the trial. Radiation shown alongside another step now appears as a single line on the sheet instead of repeating its schedule in a paragraph, in every pathway that draws it that way.' },
  { date:'2026-09-01', text:'Printing fixed. The two buttons from the phone toolbar no longer appear on the printed page, and printing portrait rather than landscape now gets its own layout, with the steps in two columns at full size, still on one page. When a sheet is too tall for one page, the map now gives up height before any text is made smaller, so dense pathways print with noticeably larger type than before. The one-page fit also applies when steps show their individual visits; a few visit-heavy pathways that cannot fit one page at readable size now break onto a second page at a whole step, never mid-text.' },
  { date:'2026-09-01', text:'Comparison pages are now readable on a phone. The side-by-side table used to collapse into one interleaved column (timeline, timeline, total, total, and so on) with no way to tell which entry belonged to which option; each option now stacks as its own complete card, with the row labels repeated inside it. Wide screens and print keep the aligned table.' },
  { date:'2026-09-01', text:'Fixed the site menu, which was missing on desktop after the mobile menu was added. The links are inline again on wide screens and open from the button on a phone.' },
  { date:'2026-09-01', text:'DESTINY-Breast11 corrected: the HER2 antibodies after surgery now run for 9 cycles rather than 13, so the pathway adds up to the about one year its own description states, counting the treatment given before surgery. The reference is now the primary publication (Annals of Oncology 2026;37:166-179) in place of a placeholder.' },
  { date:'2026-09-01', text:'The landing page example now switches between three cancers: triple-negative breast (KEYNOTE-522), muscle-invasive bladder (KEYNOTE-905 / EV-303), and stomach or gastroesophageal junction (FLOT4 / MATTERHORN). The worked comparison has been rebalanced so neither option carries more argument than the other.' },
  { date:'2026-09-01', text:'Map labels now all sit above their bars. Treatment given alongside another step put its label to the right of the bar, which read differently from every other step and could be covered by whatever followed it. Branch labels at a decision point are no longer crossed by the line leading to them. Maps with two alongside treatments are a little taller so each has room for its own label.' },
  { date:'2026-09-01', text:'Treatment that runs alongside another step can now be set to begin when that step finishes rather than at the same time, and the map draws it in that position. In KEYNOTE-522, capecitabine after surgery now appears after the radiation course instead of beside it, matching what the step text says.' },
  { date:'2026-09-01', text:'New How it works page walking through the builder step by step, including a worked comparison for stage III HER2-positive breast cancer and an example of building a ctDNA-guided pathway from scratch. The site now reads correctly on a phone; the header previously forced the whole page to zoom out. The regimen table lists the newest additions first.' },
  { date:'2026-09-01', text:'Breast: added NATALEE, an aromatase inhibitor with ribociclib for 3 years after surgery, as its own pathway, since its length differs from the 2 years of abemaciclib in monarchE. The genomic-assay pathway now offers dose-dense AC then paclitaxel as a second chemotherapy option alongside docetaxel + cyclophosphamide. Rectal: added long-course chemoradiation with FOLFOX before surgery (CAO/ARO/AIO-12), where the chemoradiation and the chemotherapy can be given in either order.' },
  { date:'2026-09-01', text:'Surveillance no longer shows a total length anywhere in the library. It now reads as ongoing with its visit and scan frequency, which is the part guidelines actually set; the frequency line stays editable for each patient. In KEYNOTE-522, capecitabine after surgery now starts once radiation has finished rather than alongside it.' },
  { date:'2026-09-01', text:'Corrected the timing shown after a radiation step whose length the radiation oncologist has not set. Later steps were dated as though radiation took no time; they now say they start after the previous step ends, and the overall figure names the radiation course separately. Seven pathways were affected. A step can also carry more than two treatment types on the map, where a third type was previously dropped from the bar while still appearing in the legend.' },
  { date:'2026-09-01', text:'Builder: the pathway list stays open until you confirm a choice, so you can look through several first; steps can be reordered from the collapsed row; adding a treatment type to a step offers a matching sentence for the patient description. Compare pages show the diagnosis as a labelled line, draw each option in its own treatment colours, and group the pathway picker by cancer type. The "You are here" marker has been removed.' },
  { date:'2026-09-01', text:'Breast: added the genomic-assay pathway (Oncotype DX / MammaPrint) with a fork to chemotherapy plus radiation and endocrine therapy or radiation and endocrine therapy alone, with an optional adjuvant CDK4/6 inhibitor. Kidney: added LITESPARK-022 belzutifan + pembrolizumab (FDA-approved June 2026). Nasopharynx: added chemoradiation alone and chemoradiation followed by adjuvant cisplatin + 5-FU alongside the induction pathway.' },
  { date:'2026-09-01', text:'New categories: head and neck (definitive chemoradiation, surgery with pathology-guided radiation, KEYNOTE-689 perioperative pembrolizumab, nasopharyngeal induction then chemoradiation) and melanoma (NADINA, SWOG S1801, adjuvant immunotherapy, adjuvant dabrafenib + trametinib). GI additions: ATOMIC for mismatch-repair-deficient stage III colon cancer (NCCN-listed; FDA decision expected October 2026) and anal canal chemoradiation with response-guided salvage surgery.' },
  { date:'2026-09-01', text:'Added ctDNA-guided adjuvant atezolizumab for muscle-invasive bladder cancer after cystectomy (IMvigor011; FDA-approved May 2026 with Signatera as the companion test). The regimen picker is now searchable by drug, trial, or cancer type.' },
  { date:'2026-09-01', text:'Added perioperative enfortumab vedotin + pembrolizumab for cisplatin-ineligible muscle-invasive bladder cancer (KEYNOTE-905 / EV-303; FDA-approved November 2025). The cisplatin-eligible trial (KEYNOTE-B15 / EV-304) read out positive in 2026 and is noted in the references.' },
  { date:'2026-08-31', text:'Added GU regimens: bladder (NIAGARA, chemotherapy then cystectomy with adjuvant nivolumab, bladder-preserving chemoradiation), kidney (KEYNOTE-564, surveillance), prostate (long- and short-course ADT with radiation, prostatectomy with PSA surveillance, active surveillance).' },
  { date:'2026-08-31', text:'Breast library regrouped by receptor status; added APT (small HER2-positive), TC ×4, and endocrine-only plans.' },
  { date:'2026-08-31', text:'Radiation steps no longer carry a default length; the radiation oncologist\'s course is entered per patient.' },
  { date:'2026-08-31', text:'Source verification pass: KEYNOTE-522 carboplatin wording, RAPIDO interval after radiation, OPRA restaging window, colon surveillance CT interval corrected.' },
  { date:'2026-08-31', text:'First release: 20 regimens across breast, GI, and lung; share links and QR codes; one-page print.' },
];

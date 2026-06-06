# Bootstrap Prompt — בנה מנוע חיפוש עבודה מלא מבוסס Claude

> העתק את כל הבלוק שבין הקווים ל-Claude Code (או claude.ai/code).
> הוא יתחיל בשיחת אונבורדינג, יבנה את המערכת המלאה, ויפרוס אותה ל-GitHub Pages.

---

```
אני רוצה שתבנה לי מערכת אוטומטית ומלאה לחיפוש עבודה, מבוססת Claude API, פרוסה על GitHub Pages. עבוד בשלבים, וקרא לי לאישור לפני כל החלטת ארכיטקטורה משמעותית.

==================================================
שלב 0 — אונבורדינג (שאל אותי לפני שאתה בונה)
==================================================
שאל אותי את השאלות הבאות, אחת-אחת, ובנה מהתשובות את הפרופיל:
1. שם מלא + פרטי קשר (טלפון, מייל, לינקדאין)
2. אילו תפקידים אני מחפש? (רשימה)
3. איפה אני מוכן לעבוד? מיקומים מקובלים + מיקומים שנדחים + האם רימוט בסדר
4. תחומי חוזק (strong fit) ותחומים שפחות מתאימים (weak fit)
5. בקש שאדביק/אעלה את קורות החיים שלי (טקסט או PDF)
6. אילו חברות ATS לעקוב אחריהן (אם יש העדפות)

מהתשובות צור:
- job_search/config.json  → roles, ats (greenhouse/lever/ashby tokens), ats_keywords, ats_locations
- job_search/profile.md   → הפרופיל המלא + ניסיון + קורות חיים מובנים

==================================================
שלב 1 — מבנה הפרויקט
==================================================
job_search/
  run_pipeline.py        # התזמורת הראשית
  ats_scraper.py         # שליפה מ-ATS ציבוריים
  config.json            # הגדרות המשתמש
  profile.md             # הפרופיל
  scored_jobs.json       # מקור האמת היחיד למשרות
  feedback.json          # זיכרון פידבק המשתמש
  tracker_template.html  # תבנית הטראקר (HTML יחיד)
docs/
  index.html             # נבנה מהתבנית (זה מה ש-GitHub Pages מגיש)
  manifest.webmanifest, sw.js, icon.svg  # קבצי PWA
.github/workflows/
  job-scan.yml           # סריקה אוטומטית
  deploy-pages.yml       # פריסה ל-Pages

==================================================
שלב 2 — הפייפליין (run_pipeline.py)
==================================================
זרימה:
1. search_jobs()  → Anthropic API, model="claude-opus-4-8", כלי web_search (max_uses ~8).
   מחזיר 8-15 משרות פתוחות אמיתיות עם URL ישיר לכל משרה.
2. scrape_ats()   → ats_scraper.py (ראה שלב 3).
3. merge + dedupe → איחוד, הסרת כפילויות לפי URL ואז לפי (company,title).
4. score_jobs()   → לכל משרה, model="claude-haiku-4-5", מחזיר JSON:
   {fit_score 1-10, score_reason, ai_opener, location_ok}. אם location_ok=false → fit_score=0.
5. filter         → location_ok==true AND fit_score>=4 AND פורסם ב-30 הימים האחרונים.
6. save           → scored_jobs.json (ראה כלל מקור האמת למטה).
7. build_html()   → החלף __JOBS_JSON__ ו-__LAST_UPDATED__ בתבנית → docs/index.html.
8. git add/commit/push.
9. (אופציונלי) שלח סיכום ב-Gmail SMTP אם יש GMAIL_USER+GMAIL_APP_PASSWORD ב-env.

### כלל מקור האמת (קריטי — אל תפר)
scored_jobs.json הוא המקור היחיד. משרות שאני מוסיף ידנית מקבלות שדה initial_status
(ואופציונלית initial_status_date, initial_rounds). הפייפליין חייב:
- לשמר כל משרה עם initial_status — לעולם לא למחוק אותן בסריקה.
- combined = pipeline_jobs + manual_jobs, כאשר pipeline_jobs מסוננות לפי (company,title)
  שלא מתנגשות עם manual.
- אם הסריקה לא מצאה כלום: שמור את משרות הפייפליין הטריות מהריצה הקודמת.
- כש-web_search נכשל: fallback מחזיר רק משרות פייפליין קיימות — אסור לנקד מחדש ידניות.

### זיכרון פידבק (feedback.json)
מבנה: {avoid_companies:[], job_feedback:{}, dismissed:{}, score_history:{}}.
ב-build_prompts(): הזרק avoid_companies לתוך פרומפט הניקוד כך שהסורק לא יציע
חברות שסומנו "לא רלוונטי". אל תזהם את הרשימה אוטומטית — רק פידבק מפורש.

==================================================
שלב 3 — ats_scraper.py (APIs ציבוריים, ללא אימות)
==================================================
פונקציות scrape_greenhouse/lever/ashby + scrape_ats(config, keywords, locations):
- Greenhouse: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
- Lever:      https://api.lever.co/v0/postings/{token}?mode=json
- Ashby:      https://api.ashbyhq.com/posting-api/job-board/{token}
לכל משרה: נקה HTML מהתיאור, סמן source="ats", שמור posted.
סנן לפני הניקוד (חיסכון בטוקנים):
- לפי כותרת: רק תפקידים שמכילים מילות מפתח מהתפקידים המבוקשים.
- לפי מיקום: רק ישראל/רימוט — אל תנקד משרות שלא יעברו ממילא.

==================================================
שלב 4 — GitHub Actions
==================================================
job-scan.yml:
  permissions: contents: write
  on: workflow_dispatch + schedule (cron 3x ביום, ראשון-חמישי: '0 5,10,15 * * 0-4')
  steps: checkout → setup-python → pip install anthropic python-dotenv →
         python job_search/run_pipeline.py (env: ANTHROPIC_API_KEY מ-secrets)

deploy-pages.yml:
  on: push to main בנתיב docs/** + workflow_dispatch
  permissions: pages: write, id-token: write
  upload-pages-artifact (path: docs) → deploy-pages

==================================================
שלב 5 — הטראקר (tracker_template.html) — זה הלב
==================================================
HTML/CSS/JS יחיד, RTL עברית, mobile-first, ללא תלות חיצונית חוץ מ-Google Fonts.
פלייסהולדרים: const JOBS=__JOBS_JSON__;  ו-__LAST_UPDATED__ (מוחלפים ב-build_html()).
כל מצב המשתמש נשמר ב-localStorage (status, channel, starred, note, interviews[], dismissed).

עיצוב — Material 3 Expressive:
- פלטה טונלית (primary/secondary/tertiary containers + on-* colors).
- פינות גדולות (28px כרטיס, 32px hero), כפתורי גלולה, Material Symbols icons, פונט Heebo.
- תג ציון כריבוע מעוגל (ירוק=גבוה, צהוב=בינוני).
- מצב כהה מלא + כפתור החלפה ידני שנשמר ב-localStorage.
- סקריפט inline ב-head שמיישם theme לפני render (מונע הבהוב).

רכיבים:
- Hero: ברכה, סטטיסטיקה, funnel (שמורות→הוגשו→ראיון→הצעה), momentum chips.
- Toolbar דביק: חיפוש, מיון (התאמה/עדכני/A-Z), פילטרים כ-chips נגללים.
- כרטיס משרה: כוכב, ציון, חברה+תפקיד, סטטוס pill, badge "חדש"/"follow-up".
  גוף נפתח: meta chips, הערת AI, איש קשר, סבבי ראיונות, הערות, stepper סטטוס, כפתורי פעולה.

סבבי ראיונות (לכל משרה, מערך interviews[]):
  שלבים: ["ראיון טלפוני","ראיון HR","ראיון וידאו","ראיון מקצועי","ראיון טכני",
          "עבודת בית / מטלה","ראיון מנהל","ראיון סופי","אחר"].
  לכל סבב: תאריך, שם מראיין, שלב (dropdown), תוצאה (ממתין/עבר/נדחה), הערה.
  צבע הסבב: ירוק לעבר, אדום לנדחה.

כפתורי פעולה — כל אחד מייצר פרומפט מוכן ל-clipboard (modal עם כפתור copy):
- "מכתב"        → פרומפט לכתיבת מכתב מקדים מותאם (פרטי המשרה + פרופיל המשתמש).
- "הכנה לראיון" → 8 שאלות צפויות + נקודות דיבור + שאלות לשאול + דגל אדום.
- "תרגול ראיון" → סימולציה אינטראקטיבית — ראה להלן.
- "דוסייר"      → מחקר חברה: גיוס, גודל, חדשות, תרבות, רלוונטיות.
- "קו״ח"        → קורות חיים מותאמים לפי מילות מפתח מהמשרה + הדפסה ל-PDF.
- "פנייה"       → מעתיק את ה-ai_opener.
- "וואטסאפ"     → שיתוף המשרה ב-WhatsApp.
- "פתח משרה"    → לינק ישיר.
- "לא רלוונטי — למד מזה" → אנימציית הסרה + שמירה ל-feedback.json + לא יוצע שוב.

### תרגול ראיון — מפרט מלא (פיצ'ר מרכזי)
כפתור "🎙️ תרגול ראיון" נפרד מ"הכנה לראיון".
הפרומפט שנוצר:
1. מזהה אוטומטית את שלב הראיון הנוכחי מ-interviews[] של המשרה:
   - מחפש סבב אחרון עם outcome="pending" → זה השלב לתרגל.
   - אם אין pending: לוקח את השלב שאחרי האחרון שהושלם.
   - fallback: "ראיון טלפוני".
2. לכל שלב יש STAGE_GUIDE שמסביר ל-Claude את הטון, העומק והסוג הצפוי:
   - ראיון טלפוני: חם, קצר, motivation/fit כללי.
   - ראיון HR: behavioral STAR, soft skills, התאמה תרבותית.
   - ראיון מקצועי: עומק RevOps/GTM — מטריקות, פייפליין, כלים.
   - ראיון טכני: תרחישים, SQL, CRM, פתרון בעיות בזמן אמת.
   - ראיון מנהל: אסטרטגיה, חשיבה עסקית, 90 ימים ראשונים.
   - ראיון סופי: חזון, מנהיגות, מה תביא לארגון לטווח ארוך.
3. Claude שואל שאלה אחת, מחכה לתשובה, ונותן פידבק:
   💪 מה היה חזק (קודם תמיד) | 🎯 מה לחדד | 📊 ניקוד 1-10 | ➡️ שאלה הבאה.
4. אחרי 6-8 שאלות: סיכום — ממוצע, מגמה, 3 חוזקות, 2 לתרגל.
5. טון מפורש: מעצים, לא מרסק. "תצא מהתרגול חזק יותר, לא מותש."

מסך אנליטיקה (modal): גרף משפך המרה, המתנה ממוצעת, כמה ממתינים ל-follow-up.

פריסה רספונסיבית:
- מובייל: accordion. שדות 16px (iOS zoom prevention), safe-area, פעולות בגריד 2-בשורה.
- דסקטופ ≥1024px: Master-Detail — רשימה צרה + פאנל פרטים (כמו Gmail).
  קיצורי מקלדת: "/" חיפוש, Esc סגירה, "t" החלפת theme. hover elevation.

PWA: manifest + service worker (network-first ל-HTML, cache-first לסטטי).
theme-color נפרד לבהיר/כהה.

==================================================
שלב 6 — עלויות והערות
==================================================
- צריך Anthropic API key (לא Claude Pro). ~$5-10 לחודש בשימוש רגיל.
  הוסף ANTHROPIC_API_KEY כ-GitHub Secret.
- הפרדת מודלים: Opus לחיפוש (איכות), Haiku לניקוד עשרות משרות (זול ומהיר) — חיסכון ~80%.
- LinkedIn: אין API ציבורי מאז 2023. אל תעשה scraping. השתמש ב-web_search + ATS APIs.

תתחיל עכשיו בשלב 0 — שאל אותי את שאלות האונבורדינג.
```

---

## אחרי שהמערכת נבנתה — 4 צעדי הפעלה
1. **Anthropic API**: `console.anthropic.com` → הוסף $10 קרדיט → צור API key.
2. **GitHub Secret**: Settings → Secrets → Actions → `ANTHROPIC_API_KEY`.
3. **GitHub Pages**: Settings → Pages → Branch `main`, Folder `/docs`.
4. הפעל את ה-workflow ידנית (Actions → Job Scan → Run) — ותוך ~2 דקות יש לך טראקר חי.

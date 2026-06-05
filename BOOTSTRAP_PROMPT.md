# 🚀 Bootstrap Prompt — בנה מנוע חיפוש עבודה מלא מבוסס Claude

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
- job_search/profile.md    → הפרופיל המלא + ניסיון + קורות חיים מובנים

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
  manifest.webmanifest, sw.js, icon.svg   # קבצי PWA
.github/workflows/
  job-scan.yml           # סריקה אוטומטית
  deploy-pages.yml       # פריסה ל-Pages

==================================================
שלב 2 — הפייפליין (run_pipeline.py)
==================================================
זרימה:
1. search_jobs()  → Anthropic API, model="claude-opus-4-x", כלי web_search (max_uses ~8).
   מחזיר 8-15 משרות פתוחות אמיתיות עם URL ישיר לכל משרה.
2. scrape_ats()   → ats_scraper.py (ראה שלב 3) — מושך משרות מ-Greenhouse/Lever/Ashby.
3. merge + dedupe → איחוד תוצאות web_search ו-ATS, הסרת כפילויות לפי URL ואז לפי (company,title).
4. score_jobs()   → לכל משרה, model="claude-haiku-4-x", מחזיר JSON:
   {fit_score 1-10, score_reason, ai_opener, location_ok}. אם location_ok=false → fit_score=0.
5. filter         → שמור משרות עם: location_ok==true AND fit_score>=4 AND עלתה ב-30 הימים האחרונים.
6. save           → scored_jobs.json (ראה כלל מקור האמת למטה).
7. build_html()   → החלף __JOBS_JSON__ ו-__LAST_UPDATED__ בתבנית → כתוב docs/index.html.
8. git add/commit/push.
9. (אופציונלי) שלח סיכום במייל דרך Gmail SMTP אם יש GMAIL_USER+GMAIL_APP_PASSWORD ב-env.

### כלל מקור האמת (קריטי — אל תפר)
scored_jobs.json הוא המקור היחיד. משרות שאני מוסיף ידנית מקבלות שדה initial_status
(ואופציונלית initial_status_date, initial_rounds). הפייפליין חייב:
- לשמר כל משרה עם initial_status — לעולם לא למחוק אותן בסריקה.
- combined = pipeline_jobs + manual_jobs, כאשר pipeline_jobs מסוננות לפי (company,title)
  שלא מתנגשות עם manual.
- אם הסריקה לא מצאה כלום: שמור את משרות הפייפליין הטריות מהריצה הקודמת (לא הידניות שינוקדו מחדש).
- כש-web_search נכשל: fallback מחזיר רק משרות פייפליין קיימות (לא ידניות) — אסור לנקד מחדש ידניות.

### זיכרון פידבק (feedback.json)
מבנה: {avoid_companies:[], job_feedback:{}, dismissed:{}, score_history:{}}.
ב-build_prompts(): הזרק avoid_companies ו-job_feedback לתוך פרומפט הניקוד כך שהסורק
ילמד לא להציע חברות שסומנו "לא רלוונטי". אל תזהם את הרשימה אוטומטית — רק פידבק מפורש של המשתמש.

==================================================
שלב 3 — ats_scraper.py (APIs ציבוריים, חוקי, ללא אימות)
==================================================
פונקציות scrape_greenhouse/lever/ashby + scrape_ats(config, keywords, locations):
- Greenhouse: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
- Lever:      https://api.lever.co/v0/postings/{token}?mode=json
- Ashby:      https://api.ashbyhq.com/posting-api/job-board/{token}
לכל משרה: נקה HTML מהתיאור, סמן source="ats", שמור posted.
סנן לפני הניקוד (לחיסכון בטוקנים):
- לפי כותרת: רק תפקידים שמכילים מילות מפתח מהתפקידים המבוקשים.
- לפי מיקום: רק ישראל/רימוט (או לפי ats_locations) — אל תנקד משרות שלא יעברו ממילא.

==================================================
שלב 4 — GitHub Actions
==================================================
job-scan.yml:
  permissions: contents: write
  on: workflow_dispatch + schedule (cron 3x ביום, ראשון-חמישי בלבד: '0 5,10,15 * * 0-4')
  steps: checkout → setup-python → pip install anthropic python-dotenv →
         python job_search/run_pipeline.py (env: ANTHROPIC_API_KEY מ-secrets) →
         git config user + add docs/index.html job_search/scored_jobs.json + commit + push.
deploy-pages.yml:
  on: push to main בנתיב docs/** + workflow_dispatch
  permissions: pages: write, id-token: write
  upload-pages-artifact (path: docs) → deploy-pages.

==================================================
שלב 5 — הטראקר (tracker_template.html) — זה הלב
==================================================
HTML/CSS/JS יחיד, RTL עברית, mobile-first, ללא תלות חיצונית חוץ מ-Google Fonts.
פלייסהולדרים: const JOBS=__JOBS_JSON__;  ו-__LAST_UPDATED__.
כל מצב המשתמש נשמר ב-localStorage (status, channel, starred, note, score_feedback,
interviews[], dismissed). פונקציה getJobState קוראת initial_status כ-fallback.

עיצוב — Material 3 Expressive (שפת העיצוב של גוגל):
- פלטה טונלית מ-seed אחד (primary/secondary/tertiary containers + on-* colors).
- פינות גדולות (כרטיס 28px, hero 32px), כפתורי גלולה, Material Symbols icons, פונט Heebo.
- תג ציון כריבוע מעוגל טונלי (ירוק=גבוה, צהוב=בינוני).
- מצב כהה מלא (פלטת M3 dark) עם כפתור החלפה ידני שנשמר ב-localStorage + סקריפט ב-head שמונע הבהוב.

רכיבים:
- Hero: ברכה, סטטיסטיקה, funnel (שמורות→הוגשו→ראיון→הצעה) עם ברים, momentum chips.
- Toolbar דביק (sticky): חיפוש, מיון (התאמה/עדכני/A-Z), פילטרים (שלב, ציון, תאריך) כ-chips נגללים.
- כרטיס משרה: כוכב, ציון, חברה+תפקיד, סטטוס pill, badge "חדש"/"follow-up".
  גוף נפתח: meta chips, הערת AI, איש קשר, פידבק לסינון, סבבי ראיונות, הערות אישיות,
  stepper סטטוס, ערוץ הגשה, וכפתורי פעולה.

סבבי ראיונות (לכל משרה, מערך interviews[]):
  לכל סבב: תאריך, שם מראיין, שלב, תוצאה (ממתין/עבר/נדחה), הערה.
  שלבים: ["ראיון טלפוני","ראיון HR","ראיון וידאו","ראיון מקצועי","ראיון טכני",
          "עבודת בית / מטלה","ראיון מנהל","ראיון סופי","אחר"].
  צבע הסבב משתנה לפי התוצאה (ירוק/אדום).

כפתורי פעולה (כל אחד מייצר פרומפט מוכן ל-clipboard, או פותח modal):
- "מכתב"        → פרומפט לכתיבת מכתב מקדים מותאם (פרטי המשרה + הפרופיל).
- "הכנה לראיון" → פרומפט: 8 שאלות צפויות + נקודות דיבור + שאלות לשאול + דגל אדום.
- "דוסייר"      → פרומפט מחקר חברה: גיוס, גודל, חדשות, תרבות, רלוונטיות.
- "קו״ח"        → קורות חיים מותאמים (התאמה לפי מילות מפתח מהמשרה) + הדפסה ל-PDF.
- "פנייה"       → מעתיק את ה-ai_opener.
- "וואטסאפ"     → שיתוף המשרה ב-WhatsApp.
- "פתח משרה"    → לינק ישיר.
- "לא רלוונטי — למד מזה" → מסמן dismissed=irrelevant, אנימציית הסרה, ושומר ל-feedback.json
  (דרך GitHub API עם token) כך שהסורק לא יציע שוב.

מסך אנליטיקה (modal): גרף משפך המרה (הגשה→ראיון→הצעה באחוזים), המתנה ממוצעת
אחרי הגשה, מספר סבבי ראיון שעברתי, כמה ממתינים ל-follow-up.

הגדרות (drawer): עריכת קורות חיים, עריכת תפקידים (יצוא config.json),
GitHub token (לסריקה ידנית + סנכרון פידבק).

פריסה רספונסיבית:
- מובייל: כרטיסים accordion. אופטימיזציות: שדות 16px (מונע zoom ב-iOS), safe-area,
  פילטרים נגללים אופקית, גריד פעולות 2-בשורה, touch targets גדולים.
- דסקטופ ≥1024px: Master-Detail — רשימה צרה דביקה מימין + פאנל פרטים רחב משמאל
  (כמו Gmail/Linear). ללא כפילות IDs (הפרטים רק בפאנל). hover elevation,
  קיצורי מקלדת ("/" חיפוש, Esc סגירה, t החלפת theme), פסי גלילה עדינים.

PWA: manifest + service worker (network-first ל-HTML, cache-first לסטטי) → ניתן
"להוסיף למסך הבית" באנדרואיד ובמק, ועובד offline. theme-color לבהיר/כהה.

==================================================
שלב 6 — עלויות והערות
==================================================
- צריך Anthropic API key (לא Claude Pro). ~$5-10 לחודש בשימוש רגיל. הוסף ANTHROPIC_API_KEY ל-GitHub Secrets.
- הפרדת מודלים: Opus לחיפוש (איכות), Haiku לניקוד עשרות משרות (זול ומהיר) — חיסכון ~80%.
- LinkedIn: אין API ציבורי מאז 2023; אל תעשה scraping (מנוגד ל-ToS). השתמש ב-web_search
  למשרות ציבוריות + ATS APIs. סנכרון הגשות = ייצוא CSV ידני מ-LinkedIn.

תתחיל עכשיו בשלב 0 — שאל אותי את שאלות האונבורדינג.
```

---

## אחרי שהמערכת נבנתה — 4 צעדי הפעלה
1. **Anthropic API**: `console.anthropic.com` → הוסף $10 קרדיט → צור API key.
2. **GitHub Secret**: Settings → Secrets → Actions → `ANTHROPIC_API_KEY`.
3. **GitHub Pages**: Settings → Pages → Branch `main`, Folder `/docs`.
4. הפעל את ה-workflow ידנית (Actions → Job Scan → Run) — ותוך ~2 דקות יש לך טראקר חי.

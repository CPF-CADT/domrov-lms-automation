# Academic Service

The Academic Service owns classes, teams, assignments, rubrics, resources, and
submissions. It connects only to `academic_db`; user IDs are external Auth
identifiers carried in validated JWT claims. It never imports Auth entities or
queries the Auth database.

## Local development

```bash
cp .env.example .env
npm install
npm run build
npm test
npm run migration:run
npm start
```

The REST base path is `/api/academic`. A submission is persisted before the
optional asynchronous AI client is invoked. Configure `AI_SERVICE_URL` only
when the AI service endpoint is available; otherwise an AI-enabled submission
remains `pending` with a generated evaluation ID.

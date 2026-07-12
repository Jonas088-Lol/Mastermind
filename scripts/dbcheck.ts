/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const [topics, questions, vocabLists] = await Promise.all([
    p.exerciseTopic.count(),
    p.exerciseQuestion.count(),
    p.vocabList.count(),
  ]);
  console.log('ExerciseTopics:', topics);
  console.log('ExerciseQuestions:', questions);
  console.log('VocabLists:', vocabLists);

  const subjects = await p.exerciseTopic.groupBy({ by: ['subject'], _count: { id: true } });
  subjects.sort((a, b) => a._count.id - b._count.id);
  subjects.forEach((s: any) => console.log(' ', s.subject, ':', s._count.id, 'topics'));
}

main().catch(console.error).finally(() => p.$disconnect());

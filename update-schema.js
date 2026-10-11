const fs = require('fs');
let schema = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

// We will append the new models and modify existing ones safely.
// First, modify Class model
schema = schema.replace(
  /model Class \{[\s\S]*?\}/,
  `model Class {
  id             String        @id @default(uuid())
  name           String
  semester       Int           // Legacy
  isActive       Boolean       @default(true)
  
  semesterId     String?       // New hierarchical link
  academicSem    Semester?     @relation(fields: [semesterId], references: [id])
  
  subjects       Subject[]     @relation("ClassToSubject")
  students       Student[]
}`
);

// Modify Subject model
schema = schema.replace(
  /model Subject \{[\s\S]*?\}/,
  `model Subject {
  id             String        @id @default(uuid())
  name           String
  code           String        // Remove unique constraint to allow same code in diff semesters
  isActive       Boolean       @default(true)
  
  classId        String?       // Legacy link
  
  semesterId     String?       // New hierarchical link
  academicSem    Semester?     @relation(fields: [semesterId], references: [id])
  
  classes        Class[]       @relation("ClassToSubject")
  
  sessions       AttendanceSession[]
}`
);

// Append new models
schema += `

model AcademicYear {
  id             String      @id @default(uuid())
  name           String      @unique // e.g. "2026-2027"
  startDate      DateTime
  endDate        DateTime
  isActive       Boolean     @default(true)
  
  semesters      Semester[]
}

model Program {
  id             String      @id @default(uuid())
  name           String      @unique // e.g. "B.Tech CSE"
  
  semesters      Semester[]
}

model Semester {
  id             String      @id @default(uuid())
  number         Int
  isActive       Boolean     @default(true)
  
  academicYearId String
  academicYear   AcademicYear @relation(fields: [academicYearId], references: [id], onDelete: Cascade)
  
  programId      String
  program        Program      @relation(fields: [programId], references: [id], onDelete: Cascade)
  
  classes        Class[]
  subjects       Subject[]

  @@unique([academicYearId, programId, number])
}
`;

fs.writeFileSync('backend/prisma/schema.prisma', schema);
console.log('Schema updated safely');

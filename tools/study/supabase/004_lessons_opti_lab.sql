-- Cho phép khóa của Optimizely Exam Lab (opti-bank-dev-core, opti-scn-..., opti-att-...) trong study.lessons
alter table study.lessons drop constraint if exists lessons_key_check;
alter table study.lessons add constraint lessons_key_check check (key ~ '^(w[0-9]{2}-[SFADO]|opti-[a-z0-9-]{1,40})$');

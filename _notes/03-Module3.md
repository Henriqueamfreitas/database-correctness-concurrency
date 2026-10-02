For each rule below, tell me whether you think it should be enforced only in application code, in the database, or both.
Do not worry about naming the exact SQL feature yet.
1. A user's display name must be at most 80 characters.
  both, if developer forgets the validation
2. Two users must not have the same email address.
  both, two requests arrive concurrently or another application writes to the database
3. An appointment slot may have at most one patient.
  both, two requests arrive concurrently or another application writes to the database
4. A password must contain at least one uppercase letter.
  application: this wont break the database... database normally stores a password hash
5. Product stock must never be negative.
  both, two requests arrive concurrently
6. A transfer amount must be greater than zero.
  Both if the amount is persisted as part of a transfer record; otherwise application validation may be sufficient.



Choose PRIMARY KEY, UNIQUE, CHECK, or none/more information needed for each. Some may need more than one constraint.
1. users.id — every user must have a distinct internal identifier.
PRIMARY KEY, because is the identity of the user, will be unique and cannot be updated
2. users.email — two users cannot register the same email.
UNIQUE, because is NOT the identity of the user, will be unique and can be updated
3. products.price — price cannot be negative.
CHECK, because is just a business rule and you have to compare the value just with a constant
4. Appointment (hospital_id, date, time) — two appointments cannot occupy the same hospital slot.
UNIQUE, but for more than one column, because its not an identity and hou have to compare this rule against all data to be valid, not just itself with a constatn value like on 4
5. orders.status — allowed values are only:
   pending, paid, cancelled.
CHECK, because is just a business rule and you have to compare the value just with a constant (pending, paid, cancelled)
6. employees.cpf — each employee must have a different CPF, but employees already have an id primary key.
UNIQUE, because is NOT the identity of the user, will be unique and can be updated
7. accounts.balance — balance cannot be below zero.
CHECK, because is just a business rule and you have to compare the value just with a constant (pending, paid, cancelled)

CREATE TABLE appointments (
  id NUMBER, 
  hospital_id NUMBER, 
  appointment_date DATE,
  appointment_time DATETIME,
  patient_id NUMBER
);

ADD CONSTRAINT nameOfConstraint appointments id PRIMARY KEY;
ADD CONSTRAINT nameOfConstraint appointments unique (hospital_id,appointment_date,appointment_time);
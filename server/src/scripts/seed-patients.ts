import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { RandomUserService } from '../common/random-user.service';

interface Patient {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  photo: string;
  role: string;
}

const patientSchema = new mongoose.Schema<Patient>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  photo: { type: String },
  role: { type: String, default: 'patient' },
});

const PatientModel = mongoose.model<Patient>('Patient', patientSchema);

const patientsData: (Omit<Patient, 'password' | 'photo'> & {
  gender: 'male' | 'female';
})[] = [
  {
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1-555-0201',
    address: '123 Main St, City, State 12345',
    role: 'patient',
    gender: 'male',
  },
  {
    email: 'jane.smith@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1-555-0202',
    address: '456 Oak Ave, City, State 12345',
    role: 'patient',
    gender: 'female',
  },
  {
    email: 'mike.wilson@example.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    phone: '+1-555-0203',
    address: '789 Pine Rd, City, State 12345',
    role: 'patient',
    gender: 'male',
  },
];

async function seedPatients() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');

    console.log('Clearing existing patients...');
    await PatientModel.deleteMany({});
    console.log('Existing patients cleared.');

    console.log('Fetching patient photos from Random User API...');
    const randomUserService = new RandomUserService();
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

    const patientsWithHashedPasswords = await Promise.all(
      patientsData.map(async (patient) => {
        const hashedPassword = await bcrypt.hash('password123', bcryptRounds);
        const photo = await randomUserService.getRandomUserPhoto(
          patient.gender,
          'medium',
        );

        return {
          ...patient,
          password: hashedPassword,
          photo,
        };
      }),
    );

    const result = await PatientModel.insertMany(patientsWithHashedPasswords);
    console.log(`Successfully seeded ${result.length} patients!`);

    console.log('\nSeeded Patients:');
    result.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstName} ${patient.lastName}`);
      console.log(`   Email: ${patient.email}`);
      console.log(`   Phone: ${patient.phone}`);
      console.log(`   Address: ${patient.address}`);
      console.log(`   Photo: ${patient.photo}`);
      console.log(`   Password: password123 (for testing)`);
      console.log('');
    });

    console.log(
      'Note: All patients have the password "password123" for testing purposes.',
    );
  } catch (error) {
    console.error('Error seeding patients:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

void seedPatients();

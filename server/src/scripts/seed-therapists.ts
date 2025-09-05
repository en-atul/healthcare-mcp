import mongoose from 'mongoose';

interface Therapist {
  firstName: string;
  lastName: string;
  specialization: string;
  experience: number;
  rating?: number;
  email: string;
  phone: string;
  isActive: boolean;
}

const therapistSchema = new mongoose.Schema<Therapist>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialization: { type: String, required: true },
  experience: { type: Number, required: true },
  rating: { type: Number, min: 1, max: 5 },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

const TherapistModel = mongoose.model<Therapist>('Therapist', therapistSchema);

const therapistsData: Therapist[] = [
  {
    firstName: 'John',
    lastName: 'Smith',
    specialization: 'Psychotherapy',
    experience: 8,
    rating: 4.8,
    email: 'dr.smith@healthcare.com',
    phone: '+1-555-0101',
    isActive: true,
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    specialization: 'Cognitive Behavioral Therapy',
    experience: 12,
    rating: 4.9,
    email: 'dr.johnson@healthcare.com',
    phone: '+1-555-0102',
    isActive: true,
  },
  {
    firstName: 'Michael',
    lastName: 'Williams',
    specialization: 'Family Therapy',
    experience: 6,
    rating: 4.6,
    email: 'dr.williams@healthcare.com',
    phone: '+1-555-0103',
    isActive: true,
  },
  {
    firstName: 'Emily',
    lastName: 'Brown',
    specialization: 'Trauma Therapy',
    experience: 10,
    rating: 4.7,
    email: 'dr.brown@healthcare.com',
    phone: '+1-555-0104',
    isActive: true,
  },
  {
    firstName: 'David',
    lastName: 'Davis',
    specialization: 'Couples Counseling',
    experience: 15,
    rating: 4.9,
    email: 'dr.davis@healthcare.com',
    phone: '+1-555-0105',
    isActive: true,
  },
  {
    firstName: 'Lisa',
    lastName: 'Wilson',
    specialization: 'Child Psychology',
    experience: 5,
    rating: 4.5,
    email: 'dr.wilson@healthcare.com',
    phone: '+1-555-0106',
    isActive: true,
  },
  {
    firstName: 'Robert',
    lastName: 'Garcia',
    specialization: 'Addiction Therapy',
    experience: 20,
    rating: 4.8,
    email: 'dr.garcia@healthcare.com',
    phone: '+1-555-0107',
    isActive: true,
  },
  {
    firstName: 'Jennifer',
    lastName: 'Martinez',
    specialization: 'Anxiety Disorders',
    experience: 7,
    rating: 4.7,
    email: 'dr.martinez@healthcare.com',
    phone: '+1-555-0108',
    isActive: true,
  },
];

async function seedTherapists() {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');

    console.log('Clearing existing therapists...');
    await TherapistModel.deleteMany({});
    console.log('Existing therapists cleared.');

    console.log('Seeding therapists...');
    const result = await TherapistModel.insertMany(therapistsData);
    console.log(`Successfully seeded ${result.length} therapists!`);

    console.log('\nSeeded Therapists:');
    result.forEach((therapist, index) => {
      console.log(
        `${index + 1}. Dr. ${therapist.firstName} ${therapist.lastName} - ${therapist.specialization}`,
      );
      console.log(`   Experience: ${therapist.experience} years`);
      console.log(
        `   Rating: ${therapist.rating ? `⭐ ${therapist.rating}/5` : 'No rating yet'}`,
      );
      console.log(`   Email: ${therapist.email}`);
      console.log(`   Phone: ${therapist.phone}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error seeding therapists:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

seedTherapists();

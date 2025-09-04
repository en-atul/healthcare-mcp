import mongoose from 'mongoose';

// Define the Therapist interface
interface Therapist {
  firstName: string;
  lastName: string;
  specialization: string;
  email: string;
  phone: string;
  isActive: boolean;
}

// Define the Therapist schema
const therapistSchema = new mongoose.Schema<Therapist>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  specialization: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

// Create the Therapist model
const TherapistModel = mongoose.model<Therapist>('Therapist', therapistSchema);

// Sample therapist data
const therapistsData: Therapist[] = [
  {
    firstName: 'Dr. John',
    lastName: 'Smith',
    specialization: 'Psychotherapy',
    email: 'dr.smith@healthcare.com',
    phone: '+1-555-0101',
    isActive: true,
  },
  {
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    specialization: 'Cognitive Behavioral Therapy',
    email: 'dr.johnson@healthcare.com',
    phone: '+1-555-0102',
    isActive: true,
  },
  {
    firstName: 'Dr. Michael',
    lastName: 'Williams',
    specialization: 'Family Therapy',
    email: 'dr.williams@healthcare.com',
    phone: '+1-555-0103',
    isActive: true,
  },
  {
    firstName: 'Dr. Emily',
    lastName: 'Brown',
    specialization: 'Trauma Therapy',
    email: 'dr.brown@healthcare.com',
    phone: '+1-555-0104',
    isActive: true,
  },
  {
    firstName: 'Dr. David',
    lastName: 'Davis',
    specialization: 'Couples Counseling',
    email: 'dr.davis@healthcare.com',
    phone: '+1-555-0105',
    isActive: true,
  },
];

async function seedTherapists() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI ||
      'mongodb://mongoadmin:secret@localhost:27017/healthcare?authSource=admin';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully!');

    // Clear existing therapists
    console.log('Clearing existing therapists...');
    await TherapistModel.deleteMany({});
    console.log('Existing therapists cleared.');

    // Insert new therapists
    console.log('Seeding therapists...');
    const result = await TherapistModel.insertMany(therapistsData);
    console.log(`Successfully seeded ${result.length} therapists!`);

    // Display the seeded therapists
    console.log('\nSeeded Therapists:');
    result.forEach((therapist, index) => {
      console.log(
        `${index + 1}. Dr. ${therapist.firstName} ${therapist.lastName} - ${therapist.specialization}`,
      );
      console.log(`   Email: ${therapist.email}`);
      console.log(`   Phone: ${therapist.phone}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error seeding therapists:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
}

// Run the seed function
seedTherapists();

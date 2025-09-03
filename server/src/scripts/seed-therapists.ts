import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TherapistsService } from '../therapists/therapists.service';

async function seedTherapists() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const therapistsService = app.get(TherapistsService);

  try {
    console.log('Seeding therapists...');
    const result = await therapistsService.seedTherapists();
    console.log('Result:', result);
    console.log('Therapists seeded successfully!');
  } catch (error) {
    console.error('Error seeding therapists:', error);
  } finally {
    await app.close();
  }
}

seedTherapists();

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TherapistsService } from './therapists.service';
import { TherapistsController } from './therapists.controller';
import { Therapist, TherapistSchema } from './schemas/therapist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Therapist.name, schema: TherapistSchema },
    ]),
  ],
  controllers: [TherapistsController],
  providers: [TherapistsService],
  exports: [TherapistsService],
})
export class TherapistsModule {}

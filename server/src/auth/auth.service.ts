import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Patient, PatientDocument } from '../patients/schemas/patient.schema';
import { LoginDto, RegisterPatientDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
    private jwtService: JwtService,
  ) {}

  async registerPatient(registerDto: RegisterPatientDto) {
    const { email, password, ...rest } = registerDto;

    // Check if patient already exists
    const existingPatient = await this.patientModel.findOne({ email });
    if (existingPatient) {
      throw new ConflictException('Patient with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create patient
    const patient = new this.patientModel({
      email,
      password: hashedPassword,
      ...rest,
    });

    const savedPatient = await patient.save();

    // Generate JWT token
    const payload = {
      sub: savedPatient._id,
      email: savedPatient.email,
      role: savedPatient.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      patient: {
        id: savedPatient._id,
        email: savedPatient.email,
        firstName: savedPatient.firstName,
        lastName: savedPatient.lastName,
        role: savedPatient.role,
      },
    };
  }

  async loginPatient(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find patient
    const patient = await this.patientModel.findOne({ email });
    if (!patient) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, patient.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: patient._id,
      email: patient.email,
      role: patient.role,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      patient: {
        id: patient._id,
        email: patient.email,
        firstName: patient.firstName,
        lastName: patient.lastName,
        role: patient.role,
      },
    };
  }
}

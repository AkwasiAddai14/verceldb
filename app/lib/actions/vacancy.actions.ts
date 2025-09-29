'use server';

import mongoose, { Types } from 'mongoose';
import { connectToDB } from '../mongoose';
import Vacancy, { IVacancy } from "../models/vacancy.model";
import Jobs, { IJob } from "../models/job.model";
import Application, { IApplication } from "../models/application.model";
import Employer from "../models/employer.model";
import Employee from "../models/employee.model";
import Invoice from "../models/invoice.model";
import { currentUser } from '@clerk/nextjs/server'
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import Job from '../models/job.model';

 export const haalgebruikerMetId = async (clerkId: any) => {
    try {
        await connectToDB();
      // Controleer eerst of de gebruiker een bedrijf is
      const bedrijf = await Employer.findOne({ clerkId });
      if (bedrijf) {
        return { type: 'bedrijf', data: bedrijf };
      }
  
      // Controleer daarna of de gebruiker een freelancer is
      const freelancer = await Employee.findOne({ clerkId });
      if (freelancer) {
        return { type: 'employee', data: freelancer };
      }
  
      // Als de gebruiker niet bestaat in beide collecties
      return { type: 'none', data: null };
    } catch (error) {
      console.error('Fout bij ophalen gebruiker:', error);
      throw new Error('Er is een fout opgetreden bij het ophalen van de gebruiker.');
    }
  };
  


  export const haalVacatureMetId = async (id: string) => {

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Ongeldig vacature-ID');
    }
  
    try {
        await connectToDB();
      const vacature = await Vacancy.findById(id).exec(); // Haal het volledige document op
  
      if (!vacature) {
        return null; // Vacature niet gevonden
      }
  
      return vacature;
    } catch (error) {
      console.error('Fout bij ophalen van vacature:', error);
      throw new Error('Er is een fout opgetreden bij het ophalen van de vacature.');
    }
  };
  
  export const haalDienstenMetId = async (vacatureId: string) => {
    if (!vacatureId || !mongoose.Types.ObjectId.isValid(vacatureId)) {
      throw new Error('Ongeldig vacature-ID');
    }
  
    try {

      await connectToDB();

      const diensten = await Jobs.find({ vacancy: vacatureId }).exec(); // Haal alle diensten op die bij de vacature horen
  
      return diensten; // Retourneer de lijst met diensten
    } catch (error) {
      console.error('Fout bij ophalen van diensten:', error);
      throw new Error('Er is een fout opgetreden bij het ophalen van de diensten.');
    }
  };

  export const haalSollicitatiesMetId = async (vacatureId: string) => {
    if (!vacatureId || !mongoose.Types.ObjectId.isValid(vacatureId)) {
      throw new Error('Ongeldig vacature-ID');
    }
  
    try {

      await connectToDB();

      const sollicitaties = await Application.find({ vacancy: vacatureId }).exec(); // Haal alle sollicitaties op die bij de vacature horen
  
      return sollicitaties; // Retourneer de lijst met sollicitaties
    } catch (error) {
      console.error('Fout bij ophalen van sollicitaties:', error);
      throw new Error('Er is een fout opgetreden bij het ophalen van de sollicitaties.');
    }
  };

  interface Werktijden {
    begintijd: string;
    eindtijd: string;
    pauze?: number;
  }
  
  interface Toeslag {
    toeslag: boolean;
    toeslagType: number;
    toeslagPercentage: number;
    toeslagVan: string;
    toeslagTot: string;
  }
  
  interface CreerDienstInput {
    vacature: mongoose.Types.ObjectId;
    datum: string;
    werktijden: Werktijden;
    uurloon: number;
    toeslagen: Toeslag[];
    index: number;
  }

  const berekenBedrag = (uurloon: number, datum: string, werktijden: Werktijden, toeslagen: Toeslag[]): number => {
    const { begintijd, eindtijd, pauze = 0} = werktijden;
  
    const tijdsverschil = (new Date(`1970-01-01T${eindtijd}:00Z`).getTime() - new Date(`1970-01-01T${begintijd}:00Z`).getTime()) / 3600000;
    const werkuren = tijdsverschil - pauze / 60;
    let totaalBedrag = werkuren * uurloon;
  
    if (toeslagen.length > 0) {
      toeslagen.forEach(({ toeslag, toeslagType, toeslagPercentage, toeslagVan, toeslagTot }) => {
        if (toeslag) {
          const toeslagUren = (new Date(`1970-01-01T${toeslagTot}:00Z`).getTime() - new Date(`1970-01-01T${toeslagVan}:00Z`).getTime()) / 3600000;
          
          if (toeslagType === 1 || toeslagType === 2) {
            // Toeslag voor de hele dag
            totaalBedrag += werkuren * uurloon * (toeslagPercentage / 100);
          } else {
            // Toeslag alleen voor bepaalde uren
            totaalBedrag += toeslagUren * (uurloon * (toeslagPercentage / 100));
          }
        }
      });
    }
  
    return totaalBedrag;
  };

  export const berekenBedragVanAlleDiensten = async (sollicitatieId:string) => {


    try {

      await connectToDB();

      const sollicitatie = await Application.findById(sollicitatieId);

    if (!sollicitatie) {
      throw new Error("Sollicitatie niet gevonden.");
    }

    let totaalbedrag = 0;

    // 2️⃣ Loop door de diensten in de sollicitatie
    for (const dienstData of sollicitatie.jobs) {
      const dienst = await Jobs.findById(dienstData.dienstId);

      if (!dienst) {
        console.warn(`Dienst met ID ${dienstData.dienstId} niet gevonden, wordt overgeslagen.`);
        continue; // Ga door naar de volgende dienst
      }

      // 3️⃣ Bereken bedrag per dienst
      totaalbedrag += dienst.amount;
    }

    return totaalbedrag;
  } catch (error) {
    console.error("Fout bij het berekenen van het totaalbedrag:", error);
    return 0;
  }
};



  export const creerDienst = async (input: CreerDienstInput): Promise<IJob | null> => {
    try {
      await connectToDB();
  
      const { vacature, datum, werktijden, uurloon, toeslagen } = input;
      const bedrag = berekenBedrag(uurloon, datum, werktijden, toeslagen);
  
      const nieuweDienst = new Jobs({
        opdrachtgever: new mongoose.Types.ObjectId(), // Moet worden vervangen door de echte opdrachtgever
        vacature,
        datum,
        werktijden,
        opdrachtnemers: [],
        bedrag,
        status: 'open',
        index: 0, // Kan eventueel automatisch gegenereerd worden
      });
  
      await nieuweDienst.save();
      return nieuweDienst;
    } catch (error: any) {
      console.error('Fout bij het aanmaken van de dienst:', error);
      return null;
    }
  };

  interface CreateVacatureInput {
    opdrachtgever: string; // Bedrijf ID
    titel: string;
    opdrachtgeverNaam: string;
    functie: string;
    afbeelding: string;
    uurloon: number;
    adres: {huisnummer: string, postcode: string, straatnaam: string, stad: string};
    begindatum: Date;
    einddatum: Date;
    tijden: { begintijd: string, eindtijd: string, pauze?: number }[];
    beschrijving: string;
    vaardigheden?: string[];
    kledingsvoorschriften?: string[];
    toeslagen: {toeslag: boolean, toeslagType: number, toeslagPercentage: number, toeslagVan: string, toeslagTot: string}[];
  }
  
  export const createVacature = async (input: CreateVacatureInput): Promise<IVacancy> => {
    try {
      await connectToDB();
  
      // Nieuwe vacature aanmaken
      const nieuweVacature = new Vacancy({
        opdrachtgever: input.opdrachtgever,
        titel: input.titel,
        opdrachtgeverNaam: input.opdrachtgeverNaam,
        functie: input.functie,
        afbeelding: input.afbeelding,
        uurloon: input.uurloon,
        adres: input.adres,
        begindatum: input.begindatum,
        einddatum: input.einddatum,
        tijden: input.tijden,
        beschrijving: input.beschrijving,
        vaardigheden: input.vaardigheden,
        kledingsvoorschriften: input.kledingsvoorschriften,
        beschikbaar: true,
        diensten: [], // Diensten array toevoegen
      });
  
      // ✅ BEREKEN ALLE DATA VAN BEGIN- TOT EINDDATUM
      const beginDatum = new Date(input.begindatum);
      const eindDatum = new Date(input.einddatum);
      const dienstenIDs: mongoose.Schema.Types.ObjectId[] = [];
      let index = 0; // ✅ Zet de index buiten de loop

  
      for (let datum = beginDatum; datum <= eindDatum; datum.setDate(datum.getDate() + 1)) {
        const datumString = datum.toISOString().split('T')[0]; // Datum in "YYYY-MM-DD" formaat
  
        // ✅ LOOP DOOR ALLE WERKTIJDEN
        for (const werktijd of input.tijden) {
          const nieuweDienst = await creerDienst({
            vacature: nieuweVacature._id as mongoose.Types.ObjectId,
            datum: datumString,
            werktijden: werktijd,
            uurloon: input.uurloon,
            toeslagen: input.toeslagen || [],
            index: index // ✅ Geef de juiste index mee
          });
  
          if (nieuweDienst && nieuweDienst._id) {
            dienstenIDs.push(nieuweDienst._id as mongoose.Schema.Types.ObjectId);
            index++; // ✅ Verhoog de index na het toevoegen van een dienst
          }
          
        }
      }
  
      // ✅ OPSLAAN VAN DIENSTEN IN VACATURE
      nieuweVacature.jobs = dienstenIDs;
      const opgeslagenVacature = await nieuweVacature.save();
  
      return opgeslagenVacature;
    } catch (error: any) {
      throw new Error('Er is iets misgegaan bij het aanmaken van de vacature: ' + error.message);
    }
  };
  
  
  
/*   // Bijvoorbeeld, het aanroepen van de functie met invoer
  const vacatureInput: CreateVacatureInput = {
    opdrachtgever: '603d9b05fbd0321d63c0ac1a', // voorbeeld opdrachtgever ID
    titel: 'Software Developer',
    opdrachtgeverNaam: 'TechCorp',
    functie: 'Full Stack Developer',
    afbeelding: 'url_naar_afbeelding.jpg',
    uurloon: 25,
    adres: 'Adres van het bedrijf',
    begindatum: new Date(),
    einddatum: new Date('2025-03-31'),
    tijden: [
      { begintijd: '09:00', eindtijd: '17:00', pauze: 30 }
    ],
    beschrijving: 'Verantwoordelijk voor het ontwikkelen van webapplicaties...',
    vaardigheden: ['JavaScript', 'React', 'Node.js'],
    kledingsvoorschriften: ['Casual'],
    beschikbaar: true,
  };
  
  // Aanmaken vacature
  createVacature(vacatureInput)
    .then(vacature => console.log('Vacature succesvol aangemaakt:', vacature))
    .catch(error => console.error('Fout bij het aanmaken van vacature:', error)); */

    export const haalGeplaatsteVacatures = async ({ bedrijfId }: { bedrijfId: string }) => {


        try {

          await connectToDB();
          const bedrijf = await Employer.findById(bedrijfId);
      
          if (!bedrijf || !bedrijf.shifts) {
            throw new Error(`Bedrijf with ID ${bedrijfId} not found or shifts not available`);
          }
      
          const vacatures = await Vacancy.find({ _id: { $in: bedrijf.vacancies }, beschikbaar: true });
             
          console.log("ShiftArrays: ", JSON.stringify(vacatures, null, 2)); // Pretty print the objects for better readability
      
          return vacatures;
        } catch (error) {
          console.error('Error fetching geplaatste shifts:', error);
          throw new Error('Failed to fetch geplaatste shifts');
        }
      };

      export const haalBijbehorendeDiensten = async ({ vacatureId }: { vacatureId: string }) => {


        try {

          await connectToDB();
          const vacature = await Vacancy.findById(vacatureId);
      
          if (!vacature || !vacature.jobs) {
            throw new Error(`No diensten for vacature with ID ${vacatureId} or diensten not available`);
          }
      
          const diensten = await Job.find({ _id: { $in: vacature.jobs }, beschikbaar: true });
             
          console.log("Diensten: ", JSON.stringify(diensten, null, 2)); // Pretty print the objects for better readability
      
          return diensten;

        } catch (error) {
          console.error('Error fetching geplaatste shifts:', error);
          throw new Error('Failed to fetch geplaatste shifts');
        }
      };

      export const haalRelevanteVacatures = async (freelancerId: Types.ObjectId) => {
        try {
          await connectToDB();
          // Find the freelancer by their ObjectId
          let freelancer; 
          let vacatureArrayIds: string | any[];
          if(mongoose.Types.ObjectId.isValid(freelancerId)){
            freelancer = await Employee.findById(freelancerId);
            if (freelancer && freelancer.sollicitatie && freelancer.sollicitatie.length > 0) {
              // Fetch the related Flexpool documents
              const sollicitaties = await Application.find({ _id: { $in: freelancer.sollicitaties } }).lean() as IApplication[];
              // Extract shiftArrayIds from each shift
              console.log("alle sollicitties: ", sollicitaties)
              vacatureArrayIds = sollicitaties.map( sollicitatie => sollicitatie.vacancy);
          } else {
            const user = await currentUser();
            if (user) {
               freelancer = await Employee.findOne({ clerkId: user.id });
               if (freelancer && freelancer.sollicitatie && freelancer.sollicitatie.length > 0) {
               // Fetch the related Flexpool documents
              const sollicitaties = await Application.find({ _id: { $in: freelancer.sollicitaties } }).lean() as IApplication[];
              // Extract shiftArrayIds from each shift
              console.log("alle sollicitties: ", sollicitaties)
              vacatureArrayIds = sollicitaties.map( sollicitatie => sollicitatie.vacancy);
              }
          } else {
            console.log('No Vacature found for this freelancer.');
            return [];
          }   
      }
          // Find all VacatureArray documents
          const allVacatureArrays = await Vacancy.find({beschikbaar: true});
      
          // Filter VacatureArrays that do not match any VacatureArrayId in the freelancer's Vacature
          const filteredVacatureArrays = allVacatureArrays.filter((vacature: any) => 
            !vacatureArrayIds.includes(vacature._id.toString())
          );
          console.log("filtered Vacature: ", allVacatureArrays)
          return filteredVacatureArrays;
        } 
      } catch (error) {
        console.error('Error fetching Vacature:', error);
        throw new Error('Failed to fetch Vacature');
        }
      }

      export const solliciteerOpVacature = async (vacatureObject: any, freelancerObject: any, diensten: any[]): Promise<IApplication> => {
        try {
          // Maak een nieuw sollicitatie object aan
          const nieuweSollicitatie = new Application({
            vacature: vacatureObject.id,
            opdrachtgever: vacatureObject.opdrachtgever, // Stel in dat de opdrachtgever van de freelancer hetzelfde is als de vacature-opdrachtgever
            diensten: diensten.map(dienst => ({
              dienstId: dienst.dienstId, 
              begintijd: dienst.begintijd,
              eindtijd: dienst.eindtijd,
              pauze: dienst.pauze,
            })),
            opdrachtnemer: {
              freelancerId: freelancerObject._id, // Het ID van de freelancer
              naam: freelancerObject.naam,
              profielfoto: freelancerObject.profielfoto,
              rating: freelancerObject.rating,
              bio: freelancerObject.bio,
              geboortedatum: freelancerObject.geboortedatum,
              klussen: freelancerObject.klussen,
              stad: freelancerObject.stad,
              emailadres: freelancerObject.emailadres,
              telefoonnummer: freelancerObject.telefoonnummer,
            }
          });
      
          // Opslaan van de sollicitatie in de database
          const opgeslagenSollicitatie = await nieuweSollicitatie.save();
          return opgeslagenSollicitatie; // Return de opgeslagen sollicitatie
      
        } catch (error: any) {
          throw new Error('Er is iets misgegaan bij het solliciteren op de vacature: ' + error.message);
        }
      };


      interface werknemerAfzeggen {
        dienstId: string,
        freelancerId: string,
     }
        
     interface WerknemerAfzeggenInput {
      dienstId: mongoose.Types.ObjectId;
      freelancerId: mongoose.Types.ObjectId;
    }
    
    export const werknemerAfzeggen = async ({ dienstId, freelancerId }: WerknemerAfzeggenInput) => {
      try {
        // 1️⃣ Zoek de freelancer op basis van freelancerId
        const freelancer = await Employee.findById(freelancerId);
    
        if (!freelancer) {
          throw new Error("Freelancer niet gevonden.");
        }
    
        // 2️⃣ Filter de diensten en verwijder de dienstId
        freelancer.diensten = freelancer.diensten.filter((id: { equals: (arg0: Types.ObjectId) => any; }) => !id.equals(dienstId));
    
        // 3️⃣ Sla de wijziging op in de database
        await freelancer.save();
    
        console.log(`Dienst ${dienstId} succesvol verwijderd voor freelancer ${freelancerId}`);
    // 4️⃣ Zoek de dienst op en verwijder de freelancer uit opdrachtnemers array
    const dienst = await Job.findById(dienstId);
    if (dienst) {
      dienst.employees = [...dienst.employees.filter(opdrachtnemer => 
        opdrachtnemer.freelancerId.toString() !== freelancerId.toString()
      )];

      // 5️⃣ Sla de wijziging op in de database
      await dienst.save();

      console.log(`Freelancer ${freelancerId} verwijderd uit opdrachtnemers van dienst ${dienstId}`);
    } else {
      console.warn(`Dienst ${dienstId} niet gevonden.`);
    }

    // 6️⃣ Stuur een e-mail naar de freelancer
    if (freelancer.emailadres) {
      await sendCancellationEmail(freelancer.emailadres, dienstId);
    } else {
      console.warn("Geen e-mailadres beschikbaar voor deze freelancer.");
    }
        
        return { success: true, message: "Dienst succesvol verwijderd en e-mail verstuurd." };
    
      } catch (error) {
        console.error("Fout bij werknemerAfzeggen:", error);
        return { success: false, message: "Er ging iets mis bij het afzeggen van de dienst." };
      }
    };
    
    // **E-mailfunctie**
    const sendCancellationEmail = async (email: string, dienstId: mongoose.Types.ObjectId) => {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER, // Zet dit in je .env bestand
            pass: process.env.EMAIL_PASS, // Zet dit in je .env bestand
          },
        });
    
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Afzegging dienst",
          text: `Beste freelancer,\n\nDe dienst met ID ${dienstId} is verwijderd uit jouw planning.\n\nMet vriendelijke groet,\nHet team.`,
        };
    
        await transporter.sendMail(mailOptions);
        console.log("E-mail verzonden naar:", email);
      } catch (error) {
        console.error("Fout bij verzenden e-mail:", error);
      }
    };

    interface AccepteerDienstenInput {
      freelancerId: mongoose.Types.ObjectId | string;
      sollicitatieId: mongoose.Types.ObjectId | string;
      dienstenIds: mongoose.Types.ObjectId[];
    }
    
    export const accepteerGeselecteerdeDiensten = async ({ freelancerId, sollicitatieId, dienstenIds }: AccepteerDienstenInput) => {
      try {
        // 1️⃣ Zoek de freelancer op
        const freelancer = await Employee.findById(freelancerId);
    
        if (!freelancer) {
          throw new Error("Freelancer niet gevonden.");
        }
    
        // 2️⃣ Voeg de diensten toe (voorkom duplicaten)
        const uniekeDiensten = new Set([...freelancer.diensten.map((id: { toString: () => any; }) => id.toString()), ...dienstenIds.map(id => id.toString())]);
        freelancer.diensten = Array.from(uniekeDiensten).map(id => new mongoose.Types.ObjectId(id));
    
        // 3️⃣ Sla de wijziging op in de database
        await freelancer.save();
        await voegFreelancerToeAanDiensten({freelancerId, sollicitatieId, dienstenIds})
        console.log(`Diensten ${dienstenIds} succesvol toegevoegd aan freelancer ${freelancerId}`);
        // 6️⃣ Verwijder de sollicitatie
        await Application.findByIdAndDelete(sollicitatieId);  // Verwijder de sollicitatie uit de database

    
        // 4️⃣ Stuur een bevestiging per e-mail
        if (freelancer.emailadres) {
          await sendAcceptanceEmail(freelancer.emailadres, dienstenIds);
        } else {
          console.warn("Geen e-mailadres beschikbaar voor deze freelancer.");
        }
    
        return { success: true, message: "Diensten succesvol toegevoegd en e-mail verstuurd." };
    
      } catch (error) {
        console.error("Fout bij accepteren van diensten:", error);
        return { success: false, message: "Er ging iets mis bij het accepteren van de diensten." };
      }
    };

    export const voegFreelancerToeAanDiensten = async ({ freelancerId, sollicitatieId, dienstenIds }: AccepteerDienstenInput) => {
      try {
        // 1️⃣ Zoek de freelancer op
        const freelancer = await Employee.findById(freelancerId);
    
        if (!freelancer) {
          throw new Error("Freelancer niet gevonden.");
        }
    
        // 2️⃣ Haal alle geselecteerde diensten op
        const diensten = await Job.find({ _id: { $in: dienstenIds } });
    
        if (!diensten.length) {
          throw new Error("Geen geldige diensten gevonden.");
        }
    
        // 3️⃣ Freelancergegevens object aanmaken
        const freelancerData = {
          freelancerId: freelancer._id,
          name: freelancer.name,
          city: freelancer.city,
          ratingCount: freelancer.ratingCount,
          profilephoto: freelancer.profilephoto,
          rating: freelancer.rating || 5, // Standaard 0 als er geen rating is
          dateOfBirth: freelancer.dateOfBirth
        };
    
        // 4️⃣ Loop door alle diensten en voeg freelancer toe (voorkom duplicaten)
        for (const dienst of diensten) {
          const bestaatAl = dienst.employees.some((opdrachtnemer) =>
            opdrachtnemer.freelancerId.toString() === freelancerId.toString()
          );
    
          if (!bestaatAl) {
            dienst.employees.push(freelancerData);
            await dienst.save(); // Sla de wijzigingen per dienst op
          }
        }

            // 5️⃣ Zoek de sollicitatie en verwijder de geselecteerde diensten
    const sollicitatie = await Application.findById(sollicitatieId);

    if (!sollicitatie) {
      throw new Error("Sollicitatie niet gevonden.");
    }

    // Verwijder de geselecteerde diensten uit de sollicitatie
    sollicitatie.jobs = sollicitatie.jobs.filter(
      job => !dienstenIds.some(dienstId => dienstId.toString() === job.dienstId.toString())
    );

    // Als de diensten array leeg is, verwijder dan de sollicitatie
    if (sollicitatie.jobs.length === 0) {
      await Application.findByIdAndDelete(sollicitatieId); // Verwijder de sollicitatie
      console.log(`Sollicitatie ${sollicitatieId} succesvol verwijderd omdat er geen diensten meer over zijn.`);
    } else {
      // Sla de wijzigingen op in de sollicitatie
      await sollicitatie.save();
      console.log(`Geselecteerde diensten succesvol verwijderd uit sollicitatie ${sollicitatieId}`);
    }
    
        console.log(`Freelancer ${freelancerId} toegevoegd aan diensten: ${dienstenIds}`);
    
        return { success: true, message: "Freelancer succesvol toegevoegd aan geselecteerde diensten." };
    
      } catch (error) {
        console.error("Fout bij toevoegen van freelancer aan diensten:", error);
        return { success: false, message: "Er ging iets mis bij het toevoegen van de freelancer." };
      }
    };
    
    // **E-mailfunctie**
    const sendRejectionEmail = async (email: string, emailSubject: string, emailBody: string) => {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER, // Zet dit in je .env bestand
            pass: process.env.EMAIL_PASS, // Zet dit in je .env bestand
          },
        });
    
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: emailSubject,
          text: emailBody,
        };
    
        await transporter.sendMail(mailOptions);
        console.log("Bevestigingsmail verzonden naar:", email);
      } catch (error) {
        console.error("Fout bij verzenden e-mail:", error);
      }
    };

    
    // **E-mailfunctie**
    const sendAcceptanceEmail = async (email: string, dienstenIds: mongoose.Types.ObjectId[]) => {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER, // Zet dit in je .env bestand
            pass: process.env.EMAIL_PASS, // Zet dit in je .env bestand
          },
        });
        
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Bevestiging geaccepteerde diensten",
          text: `Beste freelancer,\n\nJe hebt de volgende diensten geaccepteerd: ${dienstenIds.join(", ")}.\n\nMet vriendelijke groet,\nHet team.`,
        };
        
        await transporter.sendMail(mailOptions);
        console.log("Bevestigingsmail verzonden naar:", email);
      } catch (error) {
        console.error("Fout bij verzenden e-mail:", error);
      }
    };
    
    interface AfwijzingInput {
      sollicitatieId: string;
    }


    export const alleDienstenAfwijzen = async ({ sollicitatieId }: AfwijzingInput) => {
      try {
        // 1️⃣ Zoek de sollicitatie op
        const sollicitatie = await Application.findById(sollicitatieId);
    
        if (!sollicitatie) {
          throw new Error("Sollicitatie niet gevonden.");
        }
    
        // 2️⃣ Haal freelancer informatie op
        const { employeeId, email, name } = sollicitatie.employees;
    
        if (!employeeId || !email) {
          throw new Error("Geen geldige freelancer gevonden.");
        }
    
        // 3️⃣ Wijzig de status naar 'afgewezen'
        sollicitatie.status = "afgewezen";
        await sollicitatie.save();
    
        // 4️⃣ Stuur een afwijzingsmail naar de freelancer
        const emailSubject = "Afwijzing sollicitatie";
        const emailBody = `
          Beste ${name},
    
          Helaas moeten we je informeren dat je sollicitatie voor deze opdracht is afgewezen.
    
          We waarderen je interesse en hopen je in de toekomst opnieuw te kunnen verwelkomen voor andere opdrachten.
    
          Met vriendelijke groet,  
          Het Team
        `;
    
        await sendRejectionEmail(email, emailSubject, emailBody);
    
        console.log(`Sollicitatie ${sollicitatieId} afgewezen en email gestuurd naar ${email}`);
    
        return { success: true, message: "Sollicitatie afgewezen en email verzonden." };
    
      } catch (error) {
        console.error("Fout bij afwijzen van sollicitatie:", error);
        return { success: false, message: "Er ging iets mis bij het afwijzen van de sollicitatie." };
      }
    };

interface AccepteerSollicitatieDienstenInput {
  sollicitatieId: string;
}

export const accepteerSollicitatieDiensten = async ({ sollicitatieId }: AccepteerSollicitatieDienstenInput) => {
  try {
    // 1️⃣ Zoek de sollicitatie op
    const sollicitatie = await Application.findById(sollicitatieId);

    if (!sollicitatie) {
      throw new Error("Sollicitatie niet gevonden.");
    }

    // 2️⃣ Haal freelancerId en de dienstenId's op
    const freelancerId = new mongoose.Types.ObjectId(sollicitatie.employees.employeeId.toString());
    const dienstenIds = sollicitatie.jobs.map(dienst => new mongoose.Types.ObjectId(dienst.dienstId.toString()));

    if (!freelancerId) {
      throw new Error("Geen freelancer gekoppeld aan deze sollicitatie.");
    }

    // 3️⃣ Zoek de freelancer op
    const freelancer = await Employee.findById(freelancerId);

    if (!freelancer) {
      throw new Error("Freelancer niet gevonden.");
    }

    // 4️⃣ Voeg de diensten toe aan de freelancer (voorkom duplicaten)
    const uniekeDiensten = new Set([...freelancer.diensten.map((id: { toString: () => any; }) => id.toString()), ...dienstenIds.map(id => id.toString())]);
    freelancer.diensten = Array.from(uniekeDiensten).map(id => new mongoose.Types.ObjectId(id));

    // 5️⃣ Sla de wijzigingen op
    await freelancer.save();
    await voegFreelancerToeAanDiensten({freelancerId, sollicitatieId, dienstenIds})
    // 6️⃣ Verwijder de sollicitatie
    await Application.findByIdAndDelete(sollicitatieId);  // Verwijder de sollicitatie uit de database


    if (freelancer.emailadres) {
      await sendAcceptanceEmail(freelancer.emailadres, dienstenIds as unknown as mongoose.Types.ObjectId[]);
    } else {
      console.warn("Geen e-mailadres beschikbaar voor deze freelancer.");
    }
    console.log(`Diensten uit sollicitatie ${sollicitatieId} succesvol toegevoegd aan freelancer ${freelancerId}`);

    return { success: true, message: "Diensten succesvol toegevoegd aan de freelancer." };

  } catch (error) {
    console.error("Fout bij accepteren van sollicitatie-diensten:", error);
    return { success: false, message: "Er ging iets mis bij het accepteren van de diensten." };
  }
};

export const trekSollicitatieIn  = async (sollicitatieId:string, freelancerId: string) => {
   try {

    await connectToDB();
    const sollicitatie = await Application.findById(sollicitatieId);

    if (!sollicitatie) {
      throw new Error("Sollicitatie niet gevonden.");
    }

    const freelancer = await Employee.findById(freelancerId);

    if (!freelancer) {
      throw new Error("Freelancer niet gevonden.");
    }
    // 3️⃣ Verwijder de sollicitatie uit de sollicitaties array van de freelancer
    freelancer.sollicitaties = freelancer.sollicitaties.filter(
      (id: mongoose.Types.ObjectId) => id.toString() !== sollicitatieId
    );

    await freelancer.save();

    // 4️⃣ Verwijder de sollicitatie uit de database
    await Application.findByIdAndDelete(sollicitatieId);

    console.log(`Sollicitatie ${sollicitatieId} succesvol ingetrokken en verwijderd.`);

    return { success: true, message: "Sollicitatie succesvol ingetrokken." };

  } catch (error) {
    console.error("Fout bij het intrekken van de sollicitatie:", error);
    return { success: false, message: "Er ging iets mis bij het intrekken van de sollicitatie." };
  }
};

export const verwijderDienst = async (dienstId:string) => {
  
  try {
    await connectToDB();
    const dienst = await Job.findById(dienstId);

    if(!dienst){
      throw new Error("Dienst niet gevonden.");
    };

            // 2️⃣ Controleer of de annulering minimaal 72 uur voor de begintijd is
            const begintijd = new Date(`${dienst.date}T${dienst.workingtime.starting}`);
            const huidigeTijd = new Date();
            const verschilInUren = (begintijd.getTime() - huidigeTijd.getTime()) / (1000 * 60 * 60);
        
    if (verschilInUren < 72) {
      throw new Error("Diensten kunnen alleen minimaal 72 uur voor aanvang worden geannuleerd.");
    }

    const user = await currentUser();
    const freelancer = await Employee.findOne({clerkId: user?.id});

    if (!freelancer) {
      throw new Error("Freelancer niet gevonden.");
    };


    // 4️⃣ Verwijder de opdrachtnemer uit de dienst
    dienst.employees = dienst.employees.filter(
      (opdrachtnemer) => opdrachtnemer.freelancerId.toString() !== freelancer.id
    );

    // 5️⃣ Verwijder de dienst uit de freelancer zijn diensten array
    freelancer.diensten = freelancer.diensten.filter(
      (id: { toString: () => string; }) => id.toString() !== dienstId
    );

    // 6️⃣ Sla de wijzigingen op
    await dienst.save();
    await freelancer.save();

    console.log(`Dienst ${dienstId} succesvol geannuleerd voor freelancer ${freelancer.voornaam}.`);
    return { success: true, message: "Dienst succesvol geannuleerd." };

  } catch (error: any) {
    console.error("Fout bij het intrekken van de dienst:", error);
    return { success: false, message: "Er ging iets mis bij het verwijderen van de dienst." };
  }
};

export const verwijderDienstenZonderOpdrachtnemers = async () => {
  try {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes; // Huidige tijd in minuten

    // Zoek alle diensten van vandaag met een begintijd binnen 1 uur van de huidige tijd
    const diensten = await Job.find({
      datum: currentDate.toISOString().split('T')[0], // Huidige datum (yyyy-mm-dd)
    });

    for (const dienst of diensten) {
      // Haal de begintijd van de dienst en zet het om naar minuten
      const dienstBegintijd = dienst.workingtime.starting.split(':');
      const dienstBegintijdInMinuten = parseInt(dienstBegintijd[0]) * 60 + parseInt(dienstBegintijd[1]);

      // 1️⃣ Als de opdrachtnemers array leeg is, verwijder de dienst uit sollicitaties en vacatures
      if (dienst.employees.length === 0) {
        // Verwijder de dienst uit alle sollicitaties die deze dienst bevatten
        await Application.updateMany(
          { 'diensten.dienstId': dienst._id },
          { $pull: { diensten: { dienstId: dienst._id } } }
        );

        // Verwijder de dienst uit de vacature die deze dienst bevat
        await Vacancy.updateMany(
          { diensten: dienst._id },
          { $pull: { diensten: dienst._id } }
        );

        // Verwijder de dienst zelf
        await Job.deleteOne({ _id: dienst._id });

        console.log(`Dienst ${dienst._id} succesvol verwijderd uit sollicitaties en vacatures.`);
      } else {
        // 2️⃣ Als de opdrachtnemers array niet leeg is en de huidige tijd ligt meer dan 1 uur na de begintijd
        if (currentTime > dienstBegintijdInMinuten + 60) {
          // Update de status naar 'in progress'
          dienst.status = 'in progress';
          await dienst.save();

          console.log(`Status van dienst ${dienst._id} is veranderd naar 'in progress'.`);
        }
      }
    }

    return { success: true, message: 'Diensten zonder opdrachtnemers succesvol verwijderd, of status gewijzigd naar in progress.' };

  } catch (error) {
    console.error('Fout bij het verwerken van diensten:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de diensten.' };
  }
};

export const haalDienstenFreelancer =async (freelancerId:string) => {
  try {
    await connectToDB();
    const freelancer = await Employee.findById(freelancerId);

    if(!freelancer){
      throw new Error("Freelancer niet gevonden.");
    };
    const diensten = freelancer.diensten;

    return diensten;
  } catch (error: any) {
    console.error('Fout bij het verwerken van diensten:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de diensten.' };
  }
}
export const haalSollicitatiesFreelancer =async (freelancerId:string) => {
  try {
    await connectToDB();
    const freelancer = await Employee.findById(freelancerId);

    if(!freelancer){
      throw new Error("Freelancer niet gevonden.");
    };
    const sollicitaties = freelancer.sollicitaties;

    return sollicitaties
  } catch (error: any) {
    console.error('Fout bij het verwerken van sollicitaties:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de sollicitaties.' };
  }
}

export const haalGeplaatsteDiensten = async ({ bedrijfId }: { bedrijfId: string }) => {
  try {
    const bedrijf = await Employer.findById(bedrijfId);

    if (!bedrijf || !bedrijf.shifts) {
      throw new Error(`Bedrijf with ID ${bedrijfId} not found or shifts not available`);
    }

    const dienst = await Job.find({ _id: { $in: bedrijf.jobs }, beschikbaar: true });
       
    console.log("ShiftArrays: ", JSON.stringify(dienst, null, 2)); // Pretty print the objects for better readability

    return dienst;
  } catch (error) {
    console.error('Error fetching geplaatste shifts:', error);
    throw new Error('Failed to fetch geplaatste shifts');
  }
};
     

export const veranderDienstenNaarVoltooidEnMaakFacturen = async () => {
  try {
    // 1️⃣ Zoek alle diensten met de status 'in progress'
    const dienstenInProgress = await Job.find({ status: 'in progress' });

    // 2️⃣ Verander de status van de diensten naar 'voltooid'
    for (const dienst of dienstenInProgress) {
      dienst.status = 'voltooid';
      await dienst.save();
    }

    // 3️⃣ Zoek alle freelancers wiens diensten niet leeg is
    const freelancers = await Employee.find({ diensten: { $ne: [] } });

    // 4️⃣ Voor elke freelancer, maak een factuur aan
    for (const freelancer of freelancers) {
      // Bereken het totaalbedrag voor de freelancer
      let totaalbedrag = 0;
      const dienstenVoorFreelancer = freelancer.diensten;
      
      // Zoek de diensten voor de freelancer
      const diensten = await Job.find({ _id: { $in: dienstenVoorFreelancer } });

      // Bereken het totaalbedrag van de diensten
      diensten.forEach(dienst => {
        totaalbedrag += dienst.amount;  // Voeg het bedrag van de dienst toe
      });

      // Maak de factuur aan
      const factuurData = {
        week: getWeekNumber(new Date()),  // Voeg hier een weeknummer functie toe, afhankelijk van je implementatie
        diensten: diensten.map(dienst => dienst._id),
        opdrachtnemers: freelancer._id,
        opdrachtgever: '',  // Kan leeg blijven, afhankelijk van je logica
        datum: new Date(),
        tijd: new Date().toLocaleTimeString(),
        werkdatum: new Date().toLocaleDateString(),
        totaalbedrag,
        isVoltooid: false
      };

      const factuur = new Invoice(factuurData);

      // Voeg de diensten toe aan de factuur
      await factuur.save();

      console.log(`Factuur voor freelancer ${freelancer._id} aangemaakt met totaalbedrag ${totaalbedrag}`);

      // Verwijder de diensten van de freelancer (optioneel, afhankelijk van je logica)
      freelancer.diensten = freelancer.diensten.filter((dienstId: any) => !dienstenVoorFreelancer.includes(dienstId));
      await freelancer.save();

      console.log(`Diensten van freelancer ${freelancer._id} zijn verwijderd na facturatie.`);
    }

    return { success: true, message: 'Diensten zijn voltooid en facturen zijn aangemaakt.' };
  } catch (error) {
    console.error('Fout bij het verwerken van de diensten en facturen:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de diensten en facturen.' };
  }
};

// Hulpfunctie om het weeknummer van een datum te krijgen
function getWeekNumber(date: Date): string {
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + 1) / 7);
  return weekNumber.toString();
}

export const veranderDienstenNaarVoltooidEnMaakFacturenVoorBedrijven = async () => {
  try {
    // 1️⃣ Zoek alle diensten met de status 'in progress'
    const dienstenInProgress = await Job.find({ status: 'in progress' });

    // 2️⃣ Verander de status van de diensten naar 'voltooid'
    for (const dienst of dienstenInProgress) {
      dienst.status = 'voltooid';
      await dienst.save();
    }

    // 3️⃣ Zoek alle bedrijven wiens diensten niet leeg is
    const bedrijven = await Employer.find({ diensten: { $ne: [] } });

    // 4️⃣ Voor elk bedrijf, maak een factuur aan
    for (const bedrijf of bedrijven) {
      // Bereken het totaalbedrag voor het bedrijf
      let totaalbedrag = 0;
      const dienstenVoorBedrijf = bedrijf.jobs;
      
      // Zoek de diensten voor het bedrijf
      const diensten = await Job.find({ _id: { $in: dienstenVoorBedrijf } });

      // Bereken het totaalbedrag van de diensten
      diensten.forEach(dienst => {
        totaalbedrag += dienst.amount;  // Voeg het bedrag van de dienst toe
      });

      // Vermenigvuldig het totaalbedrag met 1.6 voor bedrijven
      totaalbedrag *= 1.6;

      // Maak de factuur aan voor het bedrijf
      const factuurData = {
        week: getWeekNumber(new Date()),  // Voeg hier een weeknummer functie toe, afhankelijk van je implementatie
        diensten: diensten.map(dienst => dienst._id),
        opdrachtnemers: '',  // Kan leeg blijven, afhankelijk van je logica
        opdrachtgever: bedrijf._id,  // Het bedrijf is de opdrachtgever
        datum: new Date(),
        tijd: new Date().toLocaleTimeString(),
        werkdatum: new Date().toLocaleDateString(),
        totaalbedrag,
        isVoltooid: false
      };

      const factuur = new Invoice(factuurData);

      // Voeg de diensten toe aan de factuur
      await factuur.save();

      console.log(`Factuur voor bedrijf ${bedrijf._id} aangemaakt met totaalbedrag ${totaalbedrag}`);

      // Verwijder de diensten van het bedrijf (optioneel, afhankelijk van je logica)
      bedrijf.jobs = bedrijf.jobs.filter((dienstId: any) => !dienstenVoorBedrijf.includes(dienstId));
      await bedrijf.save();

      console.log(`Diensten van bedrijf ${bedrijf._id} zijn verwijderd na facturatie.`);
    }

    return { success: true, message: 'Diensten zijn voltooid en facturen voor bedrijven zijn aangemaakt.' };
  } catch (error) {
    console.error('Fout bij het verwerken van de diensten en facturen voor bedrijven:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de diensten en facturen voor bedrijven.' };
  }
};


cron.schedule('0 * * * *', async () => {
  try {
    console.log('Running updateNoShowCheckouts job at midnight on Wednesday');

    // Ensure DB is connected before running the function
    await connectToDB();

    // Run the function to update checkouts
    await verwijderDienstenZonderOpdrachtnemers();

    console.log('Completed updateNoShowCheckouts job');
  } catch (error) {
    console.error('Error running updateNoShowCheckouts job:', error);
  }
});

cron.schedule('*  3  *  *  *  1', async () => {
  try {
    console.log('Running updateNoShowCheckouts job at midnight on Wednesday');

    // Ensure DB is connected before running the function
    await connectToDB();

    // Run the function to update checkouts
    await veranderDienstenNaarVoltooidEnMaakFacturen();
    await veranderDienstenNaarVoltooidEnMaakFacturenVoorBedrijven();

    console.log('Completed updateNoShowCheckouts job');
  } catch (error) {
    console.error('Error running updateNoShowCheckouts job:', error);
  }
});

export async function haalVacature(id: string) {
  try {
      await connectToDB();
      const vacature = await Vacancy.findById(id);
      return vacature;
  } catch (error: any) {
      console.error('Error retrieving vacature:', error);
      throw new Error(`Failed to retrieve vacature: ${error.message}`);
  }
}

export const haalFactuurDiensten = async (id:string) => {
  try {
      await connectToDB();
      const factuur = await Invoice.findById(id)
      if(factuur){
        const diensten = await Job.find({_id: {$in: factuur.diensten}})
        return diensten;
      }
    } catch (error:any) {
      throw new Error(`Failed to find dienst: ${error.message}`);
    }
}

export const checkLoonheffingskorting = async (freelancerId:string) => {
  try {
    await connectToDB();
    const freelancer = await Employee.findById(freelancerId);

    if(!freelancer){
      throw new Error("Freelancer niet gevonden.");
    };
    const loonheffingskorting = freelancer.loonheffingskorting;

    return loonheffingskorting
  } catch (error: any) {
    console.error('Fout bij het verwerken van loonheffingskorting:', error);
    return { success: false, message: 'Er ging iets mis bij het verwerken van de loonheffingskorting.' };
  }
}
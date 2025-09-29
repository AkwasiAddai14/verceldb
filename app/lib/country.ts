import { currentUser } from "@clerk/nextjs/server";


export const determineLocation = async () => {
    const user = await currentUser();
    
    const userCountry = user?.unsafeMetadata.country
    switch (userCountry) {
        case 'Nederland':
            return process.env.MONGODB_NL_URL!;
        case 'Belgie':
            return process.env.MONGODB_BE_URL!;
        case 'Frankrijk':
            return process.env.MONGODB_FR_URL!;
        case 'VerenigdKoninkrijk':
            return process.env.MONGODB_VK_URL!;
        case 'Duitsland':
            return process.env.MONGODB_DE_URL!;
        case 'Spanje':
            return process.env.MONGODB_ES_URL!;
        case 'Italie':
            return process.env.MONGODB_IT_URL!;
        case 'Portugal':
            return process.env.MONGODB_PT_URL!;
        case 'Zwitserland':
            return process.env.MONGODB_CHF_URL!;
        case 'Oostenrijk':
            return process.env.MONGODB_OS_URL!;
        case 'Denemarken':
            return process.env.MONGODB_DK_URL!;
        case 'Noorwegen':
            return process.env.MONGODB_NO_URL!;
        case 'Zweden':
            return process.env.MONGODB_ZW_URL!;
        case 'Finland':
            return process.env.MONGODB_FI_URL!;
        default:
            if (!process.env.MONGODB_URL) {
            throw new Error("Fallback MONGODB_URL not set in .env");
          }
          return process.env.MONGODB_URL;
      }
}


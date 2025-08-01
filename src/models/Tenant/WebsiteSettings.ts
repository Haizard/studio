
import mongoose, { Schema, Document } from 'mongoose';

interface NavLink {
  label: string;
  slug: string; // e.g., /about, /admissions
  order: number;
  icon?: string; // Storing icon name as a string
}

export interface IWebsiteSettings extends Document {
  schoolName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string; // For theming the public site
  secondaryColor?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialMediaLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  navLinks?: NavLink[];
  footerText?: string;
  aboutUsContent?: string; // New field for "About Us" page content
  // schoolCode is implicit as this model belongs to a tenant DB
  createdAt: Date;
  updatedAt: Date;
}

const NavLinkSchema: Schema = new Schema({
    label: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    icon: { type: String, trim: true },
}, { _id: true });


const WebsiteSettingsSchema: Schema = new Schema(
  {
    schoolName: { type: String, required: true, trim: true },
    logoUrl: { type: String, trim: true },
    faviconUrl: { type: String, trim: true },
    primaryColor: { type: String, trim: true },
    secondaryColor: { type: String, trim: true },
    tagline: { type: String, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    socialMediaLinks: {
      facebook: { type: String, trim: true },
      twitter: { type: String, trim: true },
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
    },
    navLinks: [NavLinkSchema],
    footerText: { type: String, trim: true },
    aboutUsContent: { type: String, trim: true }, // New field
  },
  { timestamps: true }
);

export default mongoose.models.WebsiteSettings || mongoose.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsSchema);

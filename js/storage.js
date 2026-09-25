import {STORAGE_KEY,createSeed,validateData} from './model.js';
export class Store {
  constructor(storage) {
    this.storage=storage;this.problem='';this.readOnly=false;
    try {const raw=storage.getItem(STORAGE_KEY);this.data=raw?validateData(JSON.parse(raw)):createSeed();if(!raw)storage.setItem(STORAGE_KEY,JSON.stringify(this.data));}
    catch(error) {this.data=createSeed();this.readOnly=true;this.problem='Η τοπική αποθήκευση δεν είναι διαθέσιμη ή περιέχει μη αναγνωρίσιμα δεδομένα. Βλέπεις προσωρινά τα δείγματα. Επίτρεψε την αποθήκευση στον browser ή επίλεξε «Επαναφορά demo» από τις ρυθμίσεις.';}
  }
  commit(next) {
    if(this.readOnly)throw new Error('Η αποθήκευση είναι ανενεργή. Δες το μήνυμα στην κορυφή της σελίδας.');
    validateData(next);
    try {this.storage.setItem(STORAGE_KEY,JSON.stringify(next));}
    catch {throw new Error('Δεν έγινε αποθήκευση. Ο browser δεν επιτρέπει αποθήκευση ή ο χώρος γέμισε. Δοκίμασε μικρότερη εικόνα ή αφαίρεσε παλιές αναρτήσεις.');}
    this.data=next;
  }
  reset() {const next=createSeed();try{this.storage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('Ο browser δεν επιτρέπει την τοπική αποθήκευση.');}this.data=next;this.readOnly=false;this.problem='';}
}

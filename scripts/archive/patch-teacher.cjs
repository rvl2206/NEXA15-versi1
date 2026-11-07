const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'TeacherManagement.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const componentCode = `
const TeacherTableRow = React.memo(({
  teacher,
  index,
  isSelected,
  handleSelectOne,
  handleToggleStatus,
  setCurrentTeacher,
  setShowCardModal,
  openEditModal,
  setDeletingTeacher
}: {
  teacher: Teacher;
  index: number;
  isSelected: boolean;
  handleSelectOne: (id: string, checked: boolean) => void;
  handleToggleStatus: (t: Teacher) => void;
  setCurrentTeacher: (t: Teacher) => void;
  setShowCardModal: (v: boolean) => void;
  openEditModal: (t: Teacher) => void;
  setDeletingTeacher: (t: Teacher) => void;
}) => {
  const isNonaktif = teacher.status === 'nonaktif';
  
  return (
    <tr
      className={\`hover:bg-white/10 transition-colors \${
        isSelected ? 'bg-sky-50/50 dark:bg-sky-950/30' : ''
      }\`}
    >
      <td className="p-3.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleSelectOne(teacher.id, e.target.checked)}
          className="rounded border-white/20 text-sky-600 focus:ring-sky-500 cursor-pointer"
        />
      </td>
      <td className="p-3.5 text-center text-slate-400 font-medium">
        {index}
      </td>
      <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
        <span className="bg-white/5 backdrop-blur-xl px-2 py-0.5 rounded-md border border-white/10">
          {teacher.nip}
        </span>
        {teacher.rfid_uid && (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded border border-sky-200 dark:border-sky-800">
              <Radio className="w-2.5 h-2.5 text-sky-500" /> {teacher.rfid_uid}
            </span>
          </div>
        )}
      </td>
      <td className="p-3.5">
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {teacher.nama}
        </div>
      </td>
      <td className="p-3.5 text-slate-700 dark:text-slate-300">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/5 backdrop-blur-xl text-slate-800 dark:text-slate-200 text-[11px] font-medium border border-white/10">
          {teacher.jabatan}
        </span>
      </td>
      <td className="p-3.5 text-center">
        <button
          type="button"
          onClick={() => handleToggleStatus(teacher)}
          title="Klik untuk mengubah status aktif / nonaktif"
          className={\`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer shadow-2xs hover:scale-105 \${
            isNonaktif
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
          }\`}
        >
          {isNonaktif ? (
            <>
              <XCircle className="w-3 h-3" />
              <span>Nonaktif</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>Aktif</span>
            </>
          )}
        </button>
      </td>
      <td className="p-3.5 text-center">
        <button
          type="button"
          onClick={() => {
            setCurrentTeacher(teacher);
            setShowCardModal(true);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 text-[10px] font-semibold transition cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Card</span>
        </button>
      </td>
      <td className="p-3.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => {
              setCurrentTeacher(teacher);
              setShowCardModal(true);
            }}
            title="Lihat & Cetak Kartu ID"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(teacher)}
            title="Edit Data Guru"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeletingTeacher(teacher)}
            title="Hapus Data Guru"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}, (prev, next) => {
  return prev.teacher === next.teacher && prev.isSelected === next.isSelected && prev.index === next.index;
});
`;

content = content.replace('export const TeacherManagement = () => {', componentCode + '\nexport const TeacherManagement = () => {');

const startStr = 'paginatedTeachers.map((teacher, index) => {';
const endStr = '})\n                )}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `paginatedTeachers.map((teacher, index) => (
                    <TeacherTableRow
                      key={teacher.id}
                      teacher={teacher}
                      index={(currentPage - 1) * itemsPerPage + index + 1}
                      isSelected={selectedIds.includes(teacher.id)}
                      handleSelectOne={handleSelectOne}
                      handleToggleStatus={handleToggleStatus}
                      setCurrentTeacher={setCurrentTeacher}
                      setShowCardModal={setShowCardModal}
                      openEditModal={openEditModal}
                      setDeletingTeacher={setDeletingTeacher}
                    />
                  ))`;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex + endStr.length);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched TeacherManagement.tsx');
} else {
  console.log('Could not find map block');
}

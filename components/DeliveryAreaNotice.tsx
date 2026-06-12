import styles from './DeliveryAreaNotice.module.css';

const supportedAreas = [
  {
    area: 'Sagar Nagar',
    pin: '530045',
    notes: 'Includes Sagar Nagar B.O and nearby GITAM Engineering College S.O area.',
  },
  {
    area: 'Rushikonda / Rushikonda Beach Side',
    pin: '530045',
    notes: 'Generally listed under 530045. Pedda Rushikonda or IT-side addresses may vary by building.',
  },
  {
    area: 'GITAM University / GITAM Engineering College Area',
    pin: '530045',
    notes: 'Shares the 530045 PIN code with Sagar Nagar and Yendada.',
  },
  {
    area: 'Yendada / Gollala Yendada',
    pin: '530045',
    notes: 'Yendada B.O is listed under PIN code 530045.',
  },
  {
    area: 'Madhurawada',
    pin: '530048',
    notes: 'Main Madhurawada S.O PIN code.',
  },
  {
    area: 'Revallapalem / Gandhi Nagar, Madhurawada Side',
    pin: '530048',
    notes: 'Usually comes under Madhurawada S.O.',
  },
  {
    area: 'Gayatri Engineering College / GVP Area',
    pin: '530048',
    notes: 'Gayatri Engineering College B.O and GVP College addresses are generally listed under 530048.',
  },
  {
    area: 'Pothinamallayya Palem / P.M. Palem',
    pin: '530041',
    notes: 'Pothinamallayapalem S.O PIN code.',
  },
  {
    area: 'Midhilapuri VUDA Colony / Mithilapuri Colony',
    pin: '530041',
    notes: 'Listed under Pothinamallayapalem 530041.',
  },
  {
    area: 'Chandrampalem / Chandrapalem',
    pin: '530041 / 530048',
    notes: 'PIN code may vary by street. Many listings show 530041, while some main-road addresses show 530048.',
  },
  {
    area: 'Bakkannapalem',
    pin: '530041 / 530048',
    notes: 'PIN code can vary depending on the exact street or address.',
  },
  {
    area: 'Kommadi',
    pin: '530048',
    notes: 'Kommadi B.O is generally listed under 530048.',
  },
  {
    area: 'Marikavalasa',
    pin: '530048',
    notes: 'Comes under Marikavalasa B.O / Madhurawada S.O area.',
  },
];

interface DeliveryAreaNoticeProps {
  compact?: boolean;
}

export default function DeliveryAreaNotice({ compact = false }: DeliveryAreaNoticeProps) {
  return (
    <section className={`${styles.notice} ${compact ? styles.compact : ''}`}>
      <div className={styles.header}>
        <h4>Delivery Areas Included in the Plan</h4>
        <p>
          Delivery charges are included in the plan only for the areas listed below. For locations outside these
          supported areas, additional delivery charges may apply based on Rapido parcel pricing.
        </p>
        <p>
          Currently, we do not have dedicated delivery persons for areas outside our supported service locations.
          As our customer base grows, we plan to expand our delivery support to more areas.
        </p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Area / Locality</th>
              <th>Common PIN Code</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {supportedAreas.map((area) => (
              <tr key={`${area.area}-${area.pin}`}>
                <td>{area.area}</td>
                <td>{area.pin}</td>
                <td>{area.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles.finalNote}>
        Areas other than the locations listed above may attract additional delivery charges based on Rapido parcel
        pricing. These charges will be separate from the selected meal plan amount.
      </p>
    </section>
  );
}
